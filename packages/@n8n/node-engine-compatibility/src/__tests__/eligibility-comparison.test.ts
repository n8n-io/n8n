import type { IWorkflowBase } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { setV1Workflow } from './acceptance-fixtures';
import {
	converterCorpus,
	expectEngineAndCheckAccept,
	expectEngineStillRefuses,
	expectEngineStillRejects,
	loadPlaywrightWorkflow,
	playwrightCorpus,
} from './eligibility-comparison';
import { engineRefusals } from './engine-refusals';

describe('engine v2 eligibility check compared with engine v2', () => {
	describe('every workflow engine v2 runs is eligible', () => {
		it.each(playwrightCorpus)('Playwright workflow %s', (file) => {
			expectEngineAndCheckAccept(loadPlaywrightWorkflow(file));
		});

		it.each(converterCorpus)('converter acceptance workflow: %s', (_name, workflow) => {
			expectEngineAndCheckAccept(workflow);
		});
	});

	describe('every refusal in engineRefusals still holds', () => {
		it.each(engineRefusals)('$name', ({ workflow, engineError, check }) => {
			if ('code' in check) {
				expectEngineStillRejects(workflow, check.code, engineError);
			} else {
				expectEngineStillRefuses(
					workflow,
					engineError,
					`Remove this row from engine-refusals.ts, and do not add the rule planned in ${check.plannedIn}.`,
				);
			}
		});
	});

	describe('expectEngineStillRejects', () => {
		// No check rule mirrors a refusal yet, so ERROR_WORKFLOW stands in for one.
		const code = 'ERROR_WORKFLOW';
		const withErrorWorkflow = (workflow: IWorkflowBase): IWorkflowBase => ({
			...workflow,
			settings: { errorWorkflow: 'error-handler' },
		});
		const [errorOutput] = engineRefusals;
		const refused = withErrorWorkflow(errorOutput.workflow);
		const accepted = withErrorWorkflow(
			setV1Workflow([{ name: 'greeting', value: 'hello', type: 'string' }]),
		);

		it('passes when engine v2 refuses the workflow with the expected error and the check reports the code', () => {
			expectEngineStillRejects(refused, code, errorOutput.engineError);
		});

		it('fails and names the rule to remove when engine v2 runs the workflow', () => {
			expect(() => expectEngineStillRejects(accepted, code, errorOutput.engineError)).toThrow(
				'Remove the ERROR_WORKFLOW rule',
			);
		});

		it('fails when engine v2 refuses the workflow with a different error', () => {
			expect(() =>
				expectEngineStillRejects(refused, code, 'more than one edge into input slot'),
			).toThrow('Engine v2 refuses this workflow with a different error');
		});

		it('fails when the check does not report the code', () => {
			expect(() =>
				expectEngineStillRejects(refused, 'REDACTION_POLICY', errorOutput.engineError),
			).toThrow('The check does not report REDACTION_POLICY');
		});
	});
});
