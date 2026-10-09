import type { SerializableAgentState } from '@n8n/agents';
import type { AgentPersistedMessageContentPart, AgentPersistedMessageDto } from '@n8n/api-types';
import fc from 'fast-check';

import type { AgentExecution } from '../entities/agent-execution.entity';
import type { TimelineEvent } from '../execution-recorder';
import { executionsToMessagesDto } from '../utils/execution-to-message-mapper';
import { withOpenSuspensions } from '../utils/messages-envelope';

// Small pools make a repeated tool call id common, with the same tool and with another tool.
const idArb = fc.constantFrom('toolu_1', 'toolu_2');
const nameArb = fc.constantFrom('build-workflow', 'propose_automation', 'executions');

/**
 * `open`: the model started the call and it got no result in its turn. `settled`: the model
 * started the call and it got its result in its turn. `result`: a resumed turn recorded only the
 * result of a call, without its input.
 */
type CallKind = 'open' | 'settled' | 'result';

interface Call {
	id: string;
	name: string;
	kind: CallKind;
}

const kindArb = fc.constantFrom<CallKind>('open', 'settled', 'result');
const callArb: fc.Arbitrary<Call> = fc.record({ id: idArb, name: nameArb, kind: kindArb });
const turnsArb = fc.array(fc.array(callArb, { maxLength: 3 }), { minLength: 1, maxLength: 6 });

const keyOf = (id: string, name: string | undefined) => `${name ?? ''}/${id}`;
const isSettled = (part: AgentPersistedMessageContentPart) =>
	part.state === 'resolved' || part.output !== undefined;
const outputOf = (turn: number, position: number) => `out-${turn}-${position}`;

function toEvent(call: Call, turn: number, position: number): TimelineEvent {
	const settled = call.kind !== 'open';
	return {
		type: 'tool-call',
		kind: 'tool',
		name: call.name,
		toolCallId: call.id,
		input: call.kind === 'result' ? undefined : { turn, position },
		output: settled ? outputOf(turn, position) : undefined,
		startTime: 100,
		endTime: settled ? 200 + turn : 0,
		success: settled,
	};
}

/** One recorded turn per entry. A settled call has an output that names its turn and position. */
function toExecutions(turns: Call[][], answers: (string | null)[] = []): AgentExecution[] {
	return turns.map((calls, turn) => {
		const answer = answers[turn];
		const timeline: TimelineEvent[] = [
			...(answer
				? [
						{
							type: 'hitl-response' as const,
							toolCallId: answer,
							response: { approved: true },
							timestamp: 1,
							respondedBy: { id: 'user-1', name: 'Ada Lovelace' },
						},
					]
				: []),
			...calls.map((call, position) => toEvent(call, turn, position)),
		];
		return {
			id: `turn-${turn}`,
			userMessage: `message ${turn}`,
			timeline,
			createdAt: new Date(0),
		} as unknown as AgentExecution;
	});
}

const outputToolParts = (executions: AgentExecution[]) =>
	executionsToMessagesDto(executions).flatMap((message) =>
		message.content
			.filter((part) => part.type === 'tool-call')
			.map((part) => ({ part, executionId: message.executionId })),
	);

interface ModelPart {
	key: string;
	executionId: string;
	input?: unknown;
	output?: unknown;
	canceled?: true;
}

/**
 * A plain model of the history: a result record settles the open call with its tool and id. A
 * call that the model starts replaces an open call with its tool and id, which gets no result.
 */
function modelHistory(turns: Call[][]): ModelPart[] {
	const parts: ModelPart[] = [];
	const open = new Map<string, ModelPart>();
	turns.forEach((calls, turn) =>
		calls.forEach((call, position) => {
			const key = keyOf(call.id, call.name);
			const waiting = open.get(key);
			const output = call.kind === 'open' ? undefined : outputOf(turn, position);
			open.delete(key);
			if (call.kind === 'result' && waiting) {
				waiting.output = output;
				return;
			}
			if (waiting) waiting.canceled = true;
			const part: ModelPart = {
				key,
				executionId: `turn-${turn}`,
				...(call.kind !== 'result' && { input: { turn, position } }),
				...(output !== undefined && { output }),
			};
			parts.push(part);
			if (call.kind === 'open') open.set(key, part);
		}),
	);
	return parts;
}

describe('history of tool calls that share ids (property)', () => {
	it('matches a plain model: each call keeps its own turn, and a result record settles the open call', () => {
		fc.assert(
			fc.property(turnsArb, (turns) => {
				const parts = outputToolParts(toExecutions(turns)).map(({ part, executionId }) => ({
					key: keyOf(part.toolCallId ?? '', part.toolName),
					executionId,
					...(part.input !== undefined && { input: part.input }),
					...(part.output !== undefined && { output: part.output }),
					...(part.canceled === true && { canceled: true }),
				}));

				expect(parts).toEqual(modelHistory(turns));
			}),
		);
	});

	it('keeps at least one part for every tool and id pair', () => {
		fc.assert(
			fc.property(turnsArb, (turns) => {
				const output = new Set(
					outputToolParts(toExecutions(turns)).map(({ part }) =>
						keyOf(part.toolCallId ?? '', part.toolName),
					),
				);
				for (const call of turns.flat()) expect(output).toContain(keyOf(call.id, call.name));
			}),
		);
	});

	it('keeps every result with its own tool and id', () => {
		fc.assert(
			fc.property(turnsArb, (turns) => {
				const settled = outputToolParts(toExecutions(turns))
					.filter(({ part }) => isSettled(part))
					.map(
						({ part }) => `${keyOf(part.toolCallId ?? '', part.toolName)}=${String(part.output)}`,
					);
				turns.forEach((calls, turn) =>
					calls.forEach((call, position) => {
						if (call.kind === 'open') return;
						expect(settled).toContain(`${keyOf(call.id, call.name)}=${outputOf(turn, position)}`);
					}),
				);
			}),
		);
	});

	it('keeps a call that the model started in its own turn, with its own input', () => {
		fc.assert(
			fc.property(turnsArb, (turns) => {
				const parts = outputToolParts(toExecutions(turns));
				turns.forEach((calls, turn) =>
					calls.forEach((call, position) => {
						if (call.kind === 'result') return;
						const own = parts.filter(
							({ part, executionId }) =>
								executionId === `turn-${turn}` &&
								keyOf(part.toolCallId ?? '', part.toolName) === keyOf(call.id, call.name) &&
								JSON.stringify(part.input) === JSON.stringify({ turn, position }),
						);
						expect(own).toHaveLength(1);
						if (call.kind === 'settled') {
							expect(own[0].part.output).toBe(outputOf(turn, position));
						}
					}),
				);
			}),
		);
	});

	it('keeps one open part for each tool and id pair at most: the latest call that got no result', () => {
		fc.assert(
			fc.property(turnsArb, (turns) => {
				// A result settles the open call with its tool and id. A later call replaces it.
				const expected = new Map<string, unknown>();
				turns.forEach((calls, turn) =>
					calls.forEach((call, position) => {
						const key = keyOf(call.id, call.name);
						if (call.kind === 'open') expected.set(key, { turn, position });
						else expected.delete(key);
					}),
				);

				const open = outputToolParts(toExecutions(turns))
					.filter(({ part }) => !isSettled(part) && part.canceled !== true)
					.map(({ part }) => [keyOf(part.toolCallId ?? '', part.toolName), part.input] as const);

				expect(open).toHaveLength(expected.size);
				expect(new Map(open)).toEqual(expected);
			}),
		);
	});

	it('merges a resumed result into the call that waited, after settled calls with the same id', () => {
		const settledTurnsArb = fc.array(
			fc.array(
				callArb.map((call): Call => ({ ...call, kind: 'settled' })),
				{ maxLength: 3 },
			),
			{ maxLength: 4 },
		);
		fc.assert(
			fc.property(settledTurnsArb, idArb, nameArb, (earlier, id, name) => {
				const waiting: Call = { id, name, kind: 'open' };
				const resumed: Call = { id, name, kind: 'result' };
				const executions = toExecutions([...earlier, [waiting], [resumed]]);
				const before = outputToolParts(toExecutions(earlier)).length;

				const parts = outputToolParts(executions);

				expect(parts).toHaveLength(before + 1);
				expect(parts.at(-1)).toEqual({
					executionId: `turn-${earlier.length}`,
					part: expect.objectContaining({
						toolName: name,
						toolCallId: id,
						input: { turn: earlier.length, position: 0 },
						state: 'resolved',
						output: outputOf(earlier.length + 1, 0),
					}),
				});
				expect(parts.at(-1)?.part.canceled).toBeUndefined();
			}),
		);
	});

	it('gives an answer author only to a call from a turn before an answer with its id', () => {
		const answersArb = fc.array(fc.option(idArb, { nil: null }), { maxLength: 6 });
		fc.assert(
			fc.property(turnsArb, answersArb, (turns, answers) => {
				for (const { part, executionId } of outputToolParts(toExecutions(turns, answers))) {
					if (!part.approvedBy) continue;
					const turn = Number(executionId?.replace('turn-', ''));
					const answeredLater = answers
						.slice(0, turns.length)
						.some((answer, answerTurn) => answer === part.toolCallId && answerTurn > turn);
					expect(answeredLater).toBe(true);
				}
			}),
		);
	});
});

describe('open suspensions in a history with repeated ids (property)', () => {
	const historyArb = fc.array(fc.array(callArb, { maxLength: 3 }), { maxLength: 5 });
	const openKeyArb = fc.record({ openId: idArb, openName: nameArb });

	// Each recorded call has its own input, so an earlier call never has the input of the open call.
	const toPart = (
		call: Call,
		turn: number,
		position: number,
	): AgentPersistedMessageContentPart => ({
		type: 'tool-call',
		toolName: call.name,
		toolCallId: call.id,
		input: { turn, position },
		...(call.kind === 'open'
			? { state: 'pending' }
			: { state: 'resolved', output: outputOf(turn, position) }),
	});

	const toHistory = (turns: Call[][]): AgentPersistedMessageDto[] =>
		turns.map((calls, turn) => ({
			id: `turn-${turn}:assistant`,
			role: 'assistant',
			content: calls.map((call, position) => toPart(call, turn, position)),
		}));

	const waitingPartOf = (openId: string, openName: string): AgentPersistedMessageContentPart => ({
		type: 'tool-call',
		toolName: openName,
		toolCallId: openId,
		input: { open: true },
		state: 'pending',
	});

	/**
	 * The checkpoint of the open turn: the thread history and the waiting call. The run settles a
	 * call of the history that waits as rejected when it loads the history. Execution history has
	 * other message ids than the checkpoint; memory has the same ids.
	 */
	function checkpointOf(
		history: AgentPersistedMessageDto[],
		open: { openId: string; openName: string },
		sameIds: boolean,
	) {
		return {
			status: 'suspended',
			pendingToolCalls: {
				[open.openId]: {
					toolCallId: open.openId,
					toolName: open.openName,
					runId: 'run-open',
					suspended: true,
					suspendPayload: { message: 'Waiting' },
				},
			},
			messageList: {
				messages: [
					...history.map((message) => ({
						...message,
						id: sameIds ? message.id : `sdk-${message.id}`,
						content: message.content.map((part) =>
							part.state === 'pending'
								? { ...part, state: 'rejected', error: 'INTERRUPTED' }
								: part,
						),
					})),
					{
						id: 'sdk-open',
						role: 'assistant',
						content: [waitingPartOf(open.openId, open.openName)],
					},
				],
			},
		} as unknown as SerializableAgentState;
	}

	/** The parts with the open id that have no result, no error and no cancellation. */
	const openPartsOf = (messages: AgentPersistedMessageDto[], openId: string) =>
		messages
			.flatMap(({ content }) => content)
			.filter(
				(part) =>
					part.type === 'tool-call' &&
					part.toolCallId === openId &&
					part.state === 'pending' &&
					part.output === undefined &&
					part.canceled !== true,
			);

	it('shows exactly one open part, the waiting call, and cancels only earlier open parts with its id', () => {
		fc.assert(
			fc.property(
				historyArb,
				openKeyArb,
				fc.boolean(),
				fc.boolean(),
				(turns, open, appendInactive, sameIds) => {
					const history = toHistory(turns);
					const result = withOpenSuspensions(
						structuredClone(history),
						checkpointOf(history, open, sameIds),
						{ appendInactiveCheckpointMessages: appendInactive },
					);
					const openKey = keyOf(open.openId, open.openName);

					// Persisted messages keep their order. A part without the open id stays as it was,
					// and so does every settled part.
					expect(result.messages.slice(0, history.length).map(({ id }) => id)).toEqual(
						history.map(({ id }) => id),
					);
					history.forEach((message, index) =>
						message.content.forEach((part, position) => {
							const after = result.messages[index].content[position];
							if (part.toolCallId !== open.openId || isSettled(part)) {
								expect(after).toEqual(part);
							} else if (keyOf(part.toolCallId, part.toolName) !== openKey) {
								expect(after).toEqual({ ...part, canceled: true });
							}
						}),
					);
					// Only the waiting call is open, with the input of the checkpoint.
					expect(openPartsOf(result.messages, open.openId)).toEqual([
						waitingPartOf(open.openId, open.openName),
					]);
					expect(result.openSuspensions).toEqual([
						{ toolCallId: open.openId, runId: 'run-open', suspendPayload: { message: 'Waiting' } },
					]);
				},
			),
		);
	});

	it('does not open a call again when the history holds its answer', () => {
		fc.assert(
			fc.property(historyArb, openKeyArb, fc.boolean(), (turns, open, sameIds) => {
				const history = toHistory(turns);
				const answered: AgentPersistedMessageDto = {
					id: sameIds ? 'sdk-open' : 'answered:assistant',
					role: 'assistant',
					content: [
						{ ...waitingPartOf(open.openId, open.openName), state: 'resolved', output: 'ok' },
					],
				};

				const result = withOpenSuspensions(
					structuredClone([...history, answered]),
					checkpointOf(history, open, sameIds),
				);

				expect(result.messages.map(({ id }) => id)).toEqual(
					[...history, answered].map(({ id }) => id),
				);
				expect(result.messages.at(-1)).toEqual(answered);
				expect(openPartsOf(result.messages, open.openId)).toEqual([]);
			}),
		);
	});
});
