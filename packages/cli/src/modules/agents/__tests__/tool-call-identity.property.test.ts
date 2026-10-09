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

interface Call {
	id: string;
	name: string;
	settled: boolean;
}

const callArb: fc.Arbitrary<Call> = fc.record({ id: idArb, name: nameArb, settled: fc.boolean() });
const turnsArb = fc.array(fc.array(callArb, { maxLength: 3 }), { minLength: 1, maxLength: 6 });

const keyOf = (id: string, name: string | undefined) => `${name ?? ''}/${id}`;
const isSettled = (part: AgentPersistedMessageContentPart) =>
	part.state === 'resolved' || part.output !== undefined;

/** One recorded turn per entry. A settled call has an output that names its turn and position. */
function toExecutions(turns: Call[][], answers: Array<string | null> = []): AgentExecution[] {
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
			...calls.map((call, position) => ({
				type: 'tool-call' as const,
				kind: 'tool' as const,
				name: call.name,
				toolCallId: call.id,
				input: { turn, position },
				output: call.settled ? `out-${turn}-${position}` : undefined,
				startTime: 100,
				endTime: call.settled ? 200 + turn : 0,
				success: call.settled,
			})),
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

describe('history of tool calls that share ids (property)', () => {
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
						if (!call.settled) return;
						expect(settled).toContain(`${keyOf(call.id, call.name)}=out-${turn}-${position}`);
					}),
				);
			}),
		);
	});

	it('keeps a call open when no later result has its tool and id', () => {
		fc.assert(
			fc.property(turnsArb, (turns) => {
				const calls = turns.flat();
				const open = outputToolParts(toExecutions(turns))
					.filter(({ part }) => !isSettled(part))
					.map(({ part }) => keyOf(part.toolCallId ?? '', part.toolName));
				calls.forEach((call, index) => {
					const key = keyOf(call.id, call.name);
					const settledLater = calls
						.slice(index + 1)
						.some((later) => later.settled && keyOf(later.id, later.name) === key);
					if (!call.settled && !settledLater) expect(open).toContain(key);
				});
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
						if (call.settled) expected.delete(key);
						else expected.set(key, { turn, position });
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
				callArb.map((call) => ({ ...call, settled: true })),
				{ maxLength: 3 },
			),
			{ maxLength: 4 },
		);
		fc.assert(
			fc.property(settledTurnsArb, idArb, nameArb, (earlier, id, name) => {
				const waiting = { id, name, settled: false };
				const executions = toExecutions([...earlier, [waiting], [{ ...waiting, settled: true }]]);
				const before = outputToolParts(toExecutions(earlier)).length;

				const parts = outputToolParts(executions);

				expect(parts).toHaveLength(before + 1);
				expect(parts.at(-1)?.part).toMatchObject({
					toolName: name,
					toolCallId: id,
					input: { turn: earlier.length, position: 0 },
					state: 'resolved',
					output: `out-${earlier.length + 1}-0`,
				});
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

	const toPart = (call: Call, label: string): AgentPersistedMessageContentPart => ({
		type: 'tool-call',
		toolName: call.name,
		toolCallId: call.id,
		...(call.settled ? { state: 'resolved', output: label } : { state: 'pending' }),
	});

	const toHistory = (turns: Call[][]): AgentPersistedMessageDto[] =>
		turns.map((calls, turn) => ({
			id: `turn-${turn}:assistant`,
			role: 'assistant',
			content: calls.map((call, position) => toPart(call, `out-${turn}-${position}`)),
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
