import fc from 'fast-check';

import { assessRepeatableWork } from '../repeatable-work';
import type { WorkSignalsInput, WorkToolCall } from '../work-signals';
import { collectWorkSignals, isWorkToolCall, readWorkToolCall } from '../work-signals';

// Names from the spec, kept apart from the implementation on purpose.
const SPEC_BUILD = 'build-workflow';
const SPEC_RUNS = 'executions';
const SPEC_IGNORED = 'propose_automation';
// Calls that look things up, plan, build or set up. They occur in most build chats.
const SPEC_NON_WORK: ReadonlyArray<[string, string | undefined]> = [
	['load_skill', undefined],
	['search_tools', undefined],
	['ask-user', undefined],
	['research', 'web-search'],
	['n8n-docs', 'search'],
	['build-workflow', undefined],
	['workflows', 'list'],
	['workflows', 'get-as-code'],
	['executions', 'get'],
	['executions', 'debug'],
	['executions', 'run-step'],
	['nodes', 'search'],
	['nodes', 'type-definition'],
	['data-tables', 'query'],
	['credentials', 'setup'],
	// Steps of the agents runtime: to-dos, memory and the sandbox workspace of the builder.
	['write_todos', undefined],
	['recall_memory', undefined],
	['workspace_write_file', undefined],
	['workspace_execute_command', undefined],
	['workspace_str_replace_file', undefined],
	// Reads and moves of the local gateway and the browser.
	['read_file', undefined],
	['search_files', undefined],
	['browser_navigate', undefined],
	['browser_snapshot', undefined],
];

// Small pools make matching workflow IDs and repeated calls likely.
const toolNameArb = fc.oneof(
	fc.constantFrom(SPEC_BUILD, SPEC_RUNS, SPEC_IGNORED, 'workflows', 'nodes'),
	fc.string({ maxLength: 10 }),
);
const actionArb = fc.option(fc.constantFrom('run', 'get', 'list', ''), { nil: undefined });
const workflowIdArb = fc.option(fc.constantFrom('wf-1', 'wf-2', ''), { nil: undefined });

const toolCallArb: fc.Arbitrary<WorkToolCall> = fc
	.record({
		toolName: toolNameArb,
		action: actionArb,
		ok: fc.boolean(),
		workflowId: workflowIdArb,
		oneOffBuildSucceeded: fc.option(fc.boolean(), { nil: undefined }),
	})
	.map(({ action, workflowId, oneOffBuildSucceeded, ...call }) => ({
		...call,
		...(action !== undefined ? { action } : {}),
		...(workflowId !== undefined ? { workflowId } : {}),
		...(oneOffBuildSucceeded !== undefined ? { oneOffBuildSucceeded } : {}),
	}));

const inputArb: fc.Arbitrary<WorkSignalsInput> = fc.record({
	userTexts: fc.array(fc.string({ maxLength: 30 }), { maxLength: 8 }),
	toolCalls: fc.array(toolCallArb, { maxLength: 30 }),
});

const counted = (calls: readonly WorkToolCall[]) => calls.filter(isWorkToolCall);

/** The spec rule, written out directly: a one-off build, then a later ok run of the same workflow. */
function hasOneOffRun(calls: readonly WorkToolCall[]): boolean {
	return calls.some(
		(build, index) =>
			build.toolName === SPEC_BUILD &&
			build.oneOffBuildSucceeded === true &&
			Boolean(build.workflowId) &&
			calls
				.slice(index + 1)
				.some(
					(later) =>
						later.toolName === SPEC_RUNS &&
						later.action === 'run' &&
						later.ok &&
						later.workflowId === build.workflowId,
				),
	);
}

describe('collectWorkSignals properties', () => {
	it('gives one signal per user text and work call, plus at most one more', () => {
		fc.assert(
			fc.property(inputArb, ({ userTexts, toolCalls }) => {
				const signals = collectWorkSignals({ userTexts, toolCalls });
				const expected = userTexts.length + counted(toolCalls).length;

				expect(signals.length).toBeGreaterThanOrEqual(expected);
				expect(signals.length).toBeLessThanOrEqual(expected + 1);
			}),
		);
	});

	it('keeps the user texts, then the counted calls, in their order', () => {
		fc.assert(
			fc.property(inputArb, ({ userTexts, toolCalls }) => {
				const signals = collectWorkSignals({ userTexts, toolCalls });

				expect(signals.flatMap((s) => (s.kind === 'user-message' ? [s.text] : []))).toEqual(
					userTexts,
				);
				expect(signals.flatMap((s) => (s.kind === 'tool-call' ? [s] : []))).toEqual(
					counted(toolCalls).map((call) => ({
						kind: 'tool-call',
						signature: `${call.toolName}:${call.action ?? ''}`,
						ok: call.ok,
					})),
				);
			}),
		);
	});

	it('gives a one-off-success exactly when a one-off build has a later ok run', () => {
		fc.assert(
			fc.property(inputArb, ({ userTexts, toolCalls }) => {
				const oneOffs = collectWorkSignals({ userTexts, toolCalls }).filter(
					(signal) => signal.kind === 'one-off-success',
				);

				expect(oneOffs.length).toBe(hasOneOffRun(toolCalls) ? 1 : 0);
			}),
		);
	});

	it('gives the same signals when propose_automation calls are added anywhere', () => {
		fc.assert(
			fc.property(
				inputArb,
				fc.array(fc.nat(), { maxLength: 5 }),
				({ userTexts, toolCalls }, positions) => {
					const withProposals = [...toolCalls];
					for (const position of positions) {
						withProposals.splice(position % (withProposals.length + 1), 0, {
							toolName: SPEC_IGNORED,
							ok: true,
							workflowId: 'wf-1',
						});
					}

					expect(collectWorkSignals({ userTexts, toolCalls: withProposals })).toEqual(
						collectWorkSignals({ userTexts, toolCalls }),
					);
				},
			),
		);
	});
});

describe('isWorkToolCall properties', () => {
	it('never counts a propose_automation call, whatever its action', () => {
		fc.assert(
			fc.property(actionArb, (action) => {
				expect(
					isWorkToolCall({ toolName: SPEC_IGNORED, ...(action !== undefined ? { action } : {}) }),
				).toBe(false);
			}),
		);
	});

	it('counts each call of a tool that n8n does not own', () => {
		fc.assert(
			fc.property(fc.string({ maxLength: 20 }), actionArb, (name, action) => {
				const call = { toolName: `gateway_${name}`, ...(action !== undefined ? { action } : {}) };

				expect(isWorkToolCall(call)).toBe(true);
			}),
		);
	});

	it('never finds repeated work in lookups, builds and set-up calls', () => {
		const nonWorkCallArb: fc.Arbitrary<WorkToolCall> = fc
			.record({ pair: fc.constantFrom(...SPEC_NON_WORK), ok: fc.boolean() })
			.map(({ pair: [toolName, action], ok }) => ({
				toolName,
				...(action !== undefined ? { action } : {}),
				ok,
			}));

		fc.assert(
			fc.property(fc.array(nonWorkCallArb, { maxLength: 40 }), (toolCalls) => {
				const assessment = assessRepeatableWork(collectWorkSignals({ userTexts: [], toolCalls }));

				expect(assessment.reasons).not.toContain('repeated-tool-call');
				expect(assessment.repeatedSignatures).toEqual([]);
			}),
		);
	});
});

describe('readWorkToolCall properties', () => {
	it('never throws and returns a call only for a tool-call part with a tool name', () => {
		fc.assert(
			fc.property(fc.anything(), (value) => {
				const call = readWorkToolCall(value);

				if (call !== undefined) {
					expect(call.toolName.trim()).not.toBe('');
					expect(typeof call.ok).toBe('boolean');
				}
			}),
		);
	});

	it('marks a call as ok only when it finished', () => {
		fc.assert(
			fc.property(
				fc.record({
					type: fc.constant('tool-call'),
					toolName: toolNameArb.filter((name) => name.trim() !== ''),
					state: fc.constantFrom('pending', 'resolved', 'rejected'),
					input: fc.anything(),
					output: fc.anything(),
				}),
				(part) => {
					const call = readWorkToolCall(part);

					expect(call).toBeDefined();
					if (part.state !== 'resolved') expect(call?.ok).toBe(false);
				},
			),
		);
	});
});
