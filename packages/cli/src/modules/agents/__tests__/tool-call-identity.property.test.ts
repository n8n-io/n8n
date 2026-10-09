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

	const toPart = (call: Call, label: string): AgentPersistedMessageContentPart => ({
		type: 'tool-call',
		toolName: call.name,
		toolCallId: call.id,
		...(call.settled ? { state: 'resolved', output: label } : { state: 'pending' }),
	});

	it('re-arms only the open call and never changes a part of another tool', () => {
		fc.assert(
			fc.property(
				historyArb,
				idArb,
				nameArb,
				fc.boolean(),
				(turns, openId, openName, appendInactive) => {
					const history: AgentPersistedMessageDto[] = turns.map((calls, turn) => ({
						id: `turn-${turn}:assistant`,
						role: 'assistant',
						content: calls.map((call, position) => toPart(call, `out-${turn}-${position}`)),
					}));
					const waitingPart = {
						type: 'tool-call',
						toolName: openName,
						toolCallId: openId,
						input: { open: true },
						state: 'pending',
					};
					const checkpoint = {
						status: 'suspended',
						pendingToolCalls: {
							[openId]: {
								toolCallId: openId,
								toolName: openName,
								runId: 'run-open',
								suspended: true,
								suspendPayload: { message: 'Waiting' },
							},
						},
						messageList: {
							messages: [
								...history.map((message) => ({ ...message, id: `sdk-${message.id}` })),
								{ id: 'sdk-open', role: 'assistant', content: [waitingPart] },
							],
						},
					} as unknown as SerializableAgentState;

					const result = withOpenSuspensions(structuredClone(history), checkpoint, {
						appendInactiveCheckpointMessages: appendInactive,
					});

					// Persisted messages keep their order, and parts of other tools stay as they were.
					expect(result.messages.slice(0, history.length).map(({ id }) => id)).toEqual(
						history.map(({ id }) => id),
					);
					history.forEach((message, index) =>
						message.content.forEach((part, position) => {
							if (part.toolName === openName && part.toolCallId === openId) return;
							expect(result.messages[index].content[position]).toEqual(part);
						}),
					);
					// With no earlier copy of the open call, the history gains the waiting call.
					const hasCopy = history.some(({ content }) =>
						content.some(
							(part) => keyOf(part.toolCallId ?? '', part.toolName) === keyOf(openId, openName),
						),
					);
					if (!hasCopy) expect(result.messages.at(-1)?.content).toEqual([waitingPart]);
					expect(result.openSuspensions).toEqual([
						{ toolCallId: openId, runId: 'run-open', suspendPayload: { message: 'Waiting' } },
					]);
				},
			),
		);
	});
});
