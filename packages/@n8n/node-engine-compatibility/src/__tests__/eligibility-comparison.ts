/*
 * Compares `@n8n/workflow-engine-check` with what engine v2 runs. The check must
 * never refuse a workflow that engine v2 runs, but it may accept one that fails
 * later, at run time.
 *
 * Workflows that engine v2 runs come from two sources:
 * - `playwrightCorpus`: JSON files from `packages/quality/testing/playwright/workflows/`.
 *   The list is kept by hand.
 * - `converterCorpus`: the workflows that `acceptance-fixtures.ts` builds for the
 *   converter acceptance tests.
 *
 * Workflows that engine v2 refuses are in `engine-refusals.ts`.
 */

import { validateExecutableGraph } from '@n8n/engine';
import type { EngineV2ReasonCode } from '@n8n/workflow-engine-check';
import { checkEngineV2Eligibility } from '@n8n/workflow-engine-check';
import type { IWorkflowBase } from 'n8n-workflow';
import { isTriggerNodeType } from 'n8n-workflow';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from 'vitest';

import { V1WorkflowConverter } from '../v1-workflow-converter';
import {
	branchyLoopV1Workflow,
	chainedLoopsV1Workflow,
	loopV1Workflow,
	selfLoopV1Workflow,
	setV1Workflow,
} from './acceptance-fixtures';

const converter = new V1WorkflowConverter();

const PLAYWRIGHT_WORKFLOWS_DIR = join(
	__dirname,
	'../../../../quality/testing/playwright/workflows',
);

/**
 * Workflow files that `@engine:v2` and `@engine:v2-only` Playwright tests import.
 * When you tag a test that imports another file, add the file here.
 */
export const playwrightCorpus = [
	'Check_manual_node_run_for_pinned_and_rundata.json',
	'Manual_long_wait_set.json',
	'Manual_wait_set.json',
	'Multiple_trigger_node_rerun.json',
	'NDV-debug-generate-data.json',
	'Test_Workflow_pairedItem_incomplete_manual_bug.json',
	'Test_workflow_partial_execution_v2.json',
	'Test_workflow_partial_execution_with_missing_credentials.json',
	'Two_schedule_triggers.json',
	'Webhook_wait_set.json',
	'binary-data-download.json',
	'data-table-node.json',
	'manual-partial-execution.json',
	'partial-execution-disabled-pinned-parent.json',
	'send-and-wait-step-bound.json',
	'send-and-wait-telegram-chat-approval.json',
	'simple-webhook-test.json',
	'subworkflow-parent-no-wait.json',
	'subworkflow-version-child.json',
	'subworkflow-version-parent.json',
	'subworkflow-wait-child.json',
	'wait-form-resume.json',
	'wait-webhook-deadline.json',
	'wait-webhook-early-resume.json',
	'wait-webhook-resume.json',
	'webhook-misconfiguration-test.json',
	'webhook-origin-isolation.json',
	'webhook-streaming.json',
];

export function loadPlaywrightWorkflow(file: string): IWorkflowBase {
	return JSON.parse(readFileSync(join(PLAYWRIGHT_WORKFLOWS_DIR, file), 'utf8')) as IWorkflowBase;
}

/** The workflows the converter acceptance tests run on engine v2. */
export const converterCorpus: Array<[string, IWorkflowBase]> = [
	['set', setV1Workflow([{ name: 'greeting', value: 'hello', type: 'string' }])],
	['loop', loopV1Workflow(1)],
	['branchy loop', branchyLoopV1Workflow(1)],
	['chained loops', chainedLoopsV1Workflow(1)],
	['self loop', selfLoopV1Workflow(1)],
];

/** Throws when the converter or the engine refuses the workflow for any of its triggers. */
export function assertEngineAccepts(workflow: IWorkflowBase): void {
	const triggerNames = workflow.nodes
		.filter((node) => node.disabled !== true && isTriggerNodeType(node.type))
		.map((node) => node.name);
	for (const triggerName of triggerNames.length > 0 ? triggerNames : [undefined]) {
		validateExecutableGraph(converter.convert(workflow, triggerName));
	}
}

export function expectEngineAndCheckAccept(workflow: IWorkflowBase): void {
	expect(() => assertEngineAccepts(workflow)).not.toThrow();
	const { eligible, reasons } = checkEngineV2Eligibility(workflow, []);
	expect(reasons.filter((reason) => reason.severity === 'blocking')).toEqual([]);
	expect(eligible).toBe(true);
}

/**
 * Asserts that the converter or the engine still refuses the workflow with
 * `engineError`. `whenAccepted` says what to change once engine v2 runs it.
 */
export function expectEngineStillRefuses(
	workflow: IWorkflowBase,
	engineError: string | RegExp,
	whenAccepted: string,
): void {
	expect(
		() => assertEngineAccepts(workflow),
		`Engine v2 now runs this workflow. ${whenAccepted}`,
	).toThrow();
	expect(
		() => assertEngineAccepts(workflow),
		'Engine v2 refuses this workflow with a different error',
	).toThrow(engineError);
}

/**
 * Pins a check rule to a workflow that engine v2 still refuses with `engineError`.
 * When an engine change makes the workflow run, this fails, because the rule now
 * blocks workflows that engine v2 runs.
 */
export function expectEngineStillRejects(
	workflow: IWorkflowBase,
	code: EngineV2ReasonCode,
	engineError: string | RegExp,
): void {
	const { reasons } = checkEngineV2Eligibility(workflow, []);
	expect(
		reasons.map((reason) => reason.code),
		`The check does not report ${code}`,
	).toContain(code);
	expectEngineStillRefuses(
		workflow,
		engineError,
		`Remove the ${code} rule from @n8n/workflow-engine-check.`,
	);
}
