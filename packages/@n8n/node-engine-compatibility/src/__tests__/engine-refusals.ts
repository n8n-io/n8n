import type { EngineV2ReasonCode } from '@n8n/workflow-engine-check';
import type { IDataObject, IWorkflowBase } from 'n8n-workflow';

import { mainTo, TRIGGER } from './acceptance-fixtures';
import { v1Workflow } from './fixtures';

/**
 * A workflow that the converter or `validateExecutableGraph` refuses, and the
 * eligibility rule that mirrors the refusal.
 */
export interface EngineRefusal {
	name: string;
	workflow: IWorkflowBase;
	/** A substring or pattern of the error that the converter or the engine throws. */
	engineError: string | RegExp;
	/** The reason code of the mirroring rule, or the ticket that plans the rule. */
	check: { code: EngineV2ReasonCode } | { plannedIn: string };
}

const node = (name: string, type: string, typeVersion = 1, parameters: IDataObject = {}) => ({
	id: name,
	name,
	type,
	typeVersion,
	parameters,
});
const noOp = (name: string) => node(name, 'n8n-nodes-base.noOp');
const merge = (mode: string) => node('Merge', 'n8n-nodes-base.merge', 3, { mode });
const splitInBatches = (
	name: string,
	parameters: IDataObject = { batchSize: 1 },
	typeVersion = 3,
) => node(name, 'n8n-nodes-base.splitInBatches', typeVersion, parameters);

const to = (name: string, index = 0) => ({ node: name, type: 'main' as const, index });
/** One array of targets for each output slot. */
const outputs = (...slots: Array<Array<ReturnType<typeof to>>>) => ({ main: slots });

/** The trigger feeds `first`. */
const fromTrigger = (
	first: string,
	nodes: Array<ReturnType<typeof node>>,
	connections: Record<string, ReturnType<typeof outputs>> = {},
) => v1Workflow([TRIGGER, ...nodes], { [TRIGGER.name]: mainTo(first), ...connections });

/** The Split In Batches node "Loop" with these parameters, right after the trigger. */
const batchNode = (parameters: IDataObject, typeVersion = 3) =>
	fromTrigger('Loop', [splitInBatches('Loop', parameters, typeVersion)]);

export const engineRefusals: EngineRefusal[] = [
	{
		name: 'a node sends errors to an error output',
		workflow: v1Workflow([TRIGGER, { ...noOp('Node'), onError: 'continueErrorOutput' }], {
			[TRIGGER.name]: mainTo('Node'),
		}),
		engineError: 'onError=continueErrorOutput',
		check: { code: 'CONTINUE_ERROR_OUTPUT' },
	},
	{
		name: 'a Merge node uses mode chooseBranch',
		workflow: fromTrigger('Merge', [merge('chooseBranch')]),
		engineError: 'Merge mode "chooseBranch"',
		check: { code: 'MERGE_CHOOSE_BRANCH' },
	},
	{
		name: 'a Merge node sets its mode with an expression',
		workflow: fromTrigger('Merge', [merge('={{ "append" }}')]),
		engineError: 'sets its Merge mode with an expression',
		check: { code: 'MERGE_MODE_EXPRESSION' },
	},
	{
		name: 'a Split In Batches node has a version other than 3',
		workflow: batchNode({ batchSize: 1 }, 2),
		engineError: 'only version 3 is supported',
		check: { code: 'SPLIT_IN_BATCHES_VERSION' },
	},
	{
		name: 'a Split In Batches node sets its options from an expression',
		workflow: batchNode({ batchSize: 1, options: '={{ {} }}' }),
		engineError: 'sets its options from an expression',
		check: { code: 'SPLIT_IN_BATCHES_OPTIONS_EXPRESSION' },
	},
	{
		name: 'a Split In Batches node uses the reset option',
		workflow: batchNode({ batchSize: 1, options: { reset: true } }),
		engineError: 'uses the reset option',
		check: { code: 'SPLIT_IN_BATCHES_RESET' },
	},
	{
		name: 'a Split In Batches node sets its batch size from an expression',
		workflow: batchNode({ batchSize: '={{ 1 }}' }),
		engineError: 'sets its batch size from an expression',
		check: { code: 'SPLIT_IN_BATCHES_BATCH_SIZE' },
	},
	{
		name: 'a Split In Batches node has a batch size below 1',
		workflow: batchNode({ batchSize: 0 }),
		engineError: 'must be a whole number of at least 1',
		check: { code: 'SPLIT_IN_BATCHES_BATCH_SIZE' },
	},
	{
		// The converter checks only connections that leave a node the trigger reaches.
		// An AI sub-node is not reached, so its connection is dropped, not refused.
		name: 'a node the trigger reaches has a connection other than main',
		workflow: v1Workflow([TRIGGER, noOp('Tool'), node('Agent', '@n8n/n8n-nodes-langchain.agent')], {
			[TRIGGER.name]: mainTo('Tool'),
			Tool: { ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]] },
		}),
		engineError: 'connection, which is not supported yet',
		check: { code: 'NON_MAIN_CONNECTION' },
	},
	{
		name: 'a cycle has no Split In Batches node',
		workflow: fromTrigger('A', [noOp('A'), noOp('B')], {
			A: outputs([to('B')]),
			B: outputs([to('A')]),
		}),
		engineError: 'Only Split In Batches loops are currently supported',
		check: { code: 'CYCLE_WITHOUT_SPLIT_IN_BATCHES' },
	},
	{
		name: 'a loop is entered at a node other than its Split In Batches node',
		workflow: fromTrigger('Body', [splitInBatches('Loop'), noOp('Body'), noOp('After')], {
			Loop: outputs([to('After')], [to('Body')]),
			Body: outputs([to('Loop')]),
		}),
		engineError: 'must be entered only through its Split In Batches node',
		check: { code: 'LOOP_ENTERED_MID_BODY' },
	},
	{
		name: 'a loop has two entry edges',
		workflow: fromTrigger(
			'A',
			[noOp('A'), noOp('B'), splitInBatches('Loop'), noOp('Body'), noOp('After')],
			{
				A: outputs([to('B'), to('Loop')]),
				B: outputs([to('Loop')]),
				Loop: outputs([to('After')], [to('Body')]),
				Body: outputs([to('Loop')]),
			},
		),
		engineError: 'converging entries on its input slot is not supported yet',
		check: { code: 'LOOP_MULTIPLE_ENTRIES' },
	},
	{
		name: 'a loop has two return edges',
		workflow: fromTrigger('Loop', [splitInBatches('Loop'), noOp('A'), noOp('B'), noOp('After')], {
			Loop: outputs([to('After')], [to('A'), to('B')]),
			A: outputs([to('Loop')]),
			B: outputs([to('Loop')]),
		}),
		engineError: 'multiple returns converge on one input slot',
		check: { code: 'LOOP_MULTIPLE_RETURNS' },
	},
	{
		name: 'a loop sits inside another loop',
		workflow: fromTrigger(
			'Outer',
			[splitInBatches('Outer'), splitInBatches('Inner'), noOp('Body'), noOp('After')],
			{
				Outer: outputs([to('After')], [to('Inner')]),
				Inner: outputs([to('Outer')], [to('Body')]),
				Body: outputs([to('Inner')]),
			},
		),
		engineError: 'nested loops are not supported yet',
		check: { code: 'NESTED_LOOP' },
	},
	{
		name: 'an edge leaves a loop from a node in its body',
		workflow: fromTrigger(
			'Loop',
			[splitInBatches('Loop'), noOp('Body'), noOp('Side'), noOp('After')],
			{
				Loop: outputs([to('After')], [to('Body')]),
				Body: outputs([to('Loop'), to('Side')]),
			},
		),
		engineError: 'mid-body',
		check: { code: 'LOOP_EXITS_MID_BODY' },
	},
	{
		name: 'an edge leaves a loop from the loop output of its Split In Batches node',
		workflow: fromTrigger(
			'Loop',
			[splitInBatches('Loop'), noOp('Body'), noOp('Side'), noOp('After')],
			{
				Loop: outputs([to('After')], [to('Body'), to('Side')]),
				Body: outputs([to('Loop')]),
			},
		),
		engineError: 'leaves the loop from the loop slot',
		check: { code: 'LOOP_EXITS_MID_BODY' },
	},
	{
		name: 'two edges feed the same input of a node',
		workflow: fromTrigger('A', [noOp('A'), noOp('B'), noOp('C')], {
			A: outputs([to('B'), to('C')]),
			B: outputs([to('C')]),
		}),
		engineError: 'more than one edge into input slot 0',
		check: { code: 'INPUT_SLOT_CONVERGENCE' },
	},
];

/*
 * Engine v2 also refuses the following, but `assertEngineAccepts` cannot see it,
 * because the refusal happens in the cli dispatcher or while a run is in progress.
 * No test ties a check rule to these refusals.
 *
 * - A trigger that takes credentials from the request:
 *   `EngineV2Dispatcher.assertSupported` in cli. Check rule: TRIGGER_EXTERNAL_IDENTITY.
 * - A run that starts at a pinned node, and a workflow that runs as an AI tool:
 *   `EngineV2Dispatcher.assertSupported` in cli. These depend on the run, so the
 *   check has no rule for them.
 * - A node type without an execute method, and a node that sends engine requests,
 *   such as an AI agent with sub-nodes: `v1-step-executor.ts`. Other node types run
 *   but miss a feature they need. Check rules: the entries of `node-type-denylist.ts`
 *   and COMMUNITY_NODE. Each entry names the ticket that removes it, and a test in
 *   @n8n/workflow-engine-check pins the list.
 * - A trigger that waits for its run to finish: `EngineV2ActiveTriggers` in cli.
 *   Check rule: TRIGGER_WAITS_FOR_RUN. It blocks when the trigger's settings make
 *   it wait, and warns when an expression decides.
 * - A wait for a sub-execution that waits, a send-and-wait approval, a wait that
 *   nothing can end, and a wait date that is not valid: `v1-step-executor.ts`. A
 *   signed resume URL without a resume secret: `v1-adapters.ts`. No check rule.
 * - An inline sub-workflow, a sub-workflow called more than once for one run of a
 *   node, and a sub-workflow call from a node other than Execute Sub-workflow:
 *   `sub-workflow-calls.ts`. No check rule.
 *
 * Not refused: engine v2 ignores these settings without an error, so no engine
 * error can pin their check rules. The rules stay until engine v2 supports the
 * setting.
 *
 * - ERROR_WORKFLOW: engine v2 runs the workflow but never starts its error workflow.
 * - REDACTION_POLICY (a warning): the cli redacts a v2 execution when it is read,
 *   but engine v2 is not fully tested with redaction.
 * - END_USER_CREDENTIALS: engine v2 runs the workflow without the credential
 *   resolver, so it does not use the end user's credentials.
 */
