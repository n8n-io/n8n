import type { IWorkflowBase } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { setV1Workflow } from './acceptance-fixtures';
import {
	converterCorpus,
	expectEngineAndCheckAccept,
	expectEngineStillRejects,
	loadPlaywrightWorkflow,
	playwrightCorpus,
} from './eligibility-comparison';

describe('engine v2 eligibility check compared with engine v2', () => {
	describe('every workflow engine v2 runs is eligible', () => {
		it.each(playwrightCorpus)('Playwright workflow %s', (file) => {
			expectEngineAndCheckAccept(loadPlaywrightWorkflow(file));
		});

		it.each(converterCorpus)('converter acceptance workflow: %s', (_name, workflow) => {
			expectEngineAndCheckAccept(workflow);
		});
	});

	describe('expectEngineStillRejects', () => {
		const withErrorWorkflow = (workflow: IWorkflowBase): IWorkflowBase => ({
			...workflow,
			settings: { errorWorkflow: 'error-handler' },
		});
		const accepted = withErrorWorkflow(
			setV1Workflow([{ name: 'greeting', value: 'hello', type: 'string' }]),
		);
		// The converter refuses an error output, so engine v2 rejects this one.
		const rejected = {
			...accepted,
			nodes: accepted.nodes.map((node) =>
				node.type === 'n8n-nodes-base.set'
					? { ...node, onError: 'continueErrorOutput' as const }
					: node,
			),
		};

		it('passes when engine v2 rejects the workflow and the check reports the code', () => {
			expectEngineStillRejects(rejected, 'ERROR_WORKFLOW');
		});

		it('fails and names the rule to remove when engine v2 runs the workflow', () => {
			expect(() => expectEngineStillRejects(accepted, 'ERROR_WORKFLOW')).toThrow(
				'Remove the ERROR_WORKFLOW rule',
			);
		});

		it('fails when the check does not report the code', () => {
			expect(() => expectEngineStillRejects(rejected, 'REDACTION_POLICY')).toThrow(
				'The check does not report REDACTION_POLICY',
			);
		});
	});
});
