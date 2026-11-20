import { ENGINE_V2_NODE_SETTING_RULES } from '@n8n/workflow-sdk/prompts/sdk-reference';

import {
	getWorkflowBuilderCues,
	WORKFLOW_BUILDER_CUES,
} from '../context-cues/workflow-builder.cues';

function cueText(cues: ReturnType<typeof getWorkflowBuilderCues>, id: string): string | undefined {
	return cues.cues.find((cue) => cue.id === id)?.text;
}

describe('getWorkflowBuilderCues', () => {
	it.each([undefined, { engineV2Available: false, newWorkflowEngine: 'v1' as const }])(
		'keeps the cues without the engine-v2 module (%p)',
		(engineSetup) => {
			expect(getWorkflowBuilderCues(engineSetup)).toBe(WORKFLOW_BUILDER_CUES);
		},
	);

	it.each(['v1', 'v2'] as const)(
		'gives the engine v2 way with the module and %s as the default',
		(newWorkflowEngine) => {
			const cues = getWorkflowBuilderCues({ engineV2Available: true, newWorkflowEngine });

			// The duplicate-notifications hint belongs to the v1 advice, so it comes before v2.
			expect(cueText(cues, 'execute-once')).toMatch(
				/^On engine v1: set `executeOnce: true`.*Duplicate notifications mean that it is missing\. On engine v2: /,
			);
			expect(cueText(cues, 'execute-once')).toContain(
				`On engine v2: ${ENGINE_V2_NODE_SETTING_RULES.EXECUTE_ONCE.text}`,
			);
			expect(cueText(cues, 'zero-items-end-branch')).toContain(
				`On engine v2: ${ENGINE_V2_NODE_SETTING_RULES.ALWAYS_OUTPUT_DATA.text}`,
			);
			expect(cueText(cues, 'always-output-data-empty-json')).toContain(
				`On engine v2: ${ENGINE_V2_NODE_SETTING_RULES.ALWAYS_OUTPUT_DATA.text}`,
			);
			expect(cueText(cues, 'on-error-one-handler')).toContain(
				ENGINE_V2_NODE_SETTING_RULES.CONTINUE_ERROR_OUTPUT.text,
			);
			expect(cueText(cues, 'engine-v2-retry-on-fail')).toContain(
				ENGINE_V2_NODE_SETTING_RULES.RETRY_ON_FAIL.text,
			);
		},
	);

	it('keeps the ids, phases and other cues', () => {
		const cues = getWorkflowBuilderCues({ engineV2Available: true, newWorkflowEngine: 'v2' });
		const ids = cues.cues.map((cue) => cue.id);

		expect(new Set(ids).size).toBe(ids.length);
		expect(ids).toEqual([
			...WORKFLOW_BUILDER_CUES.cues.map((cue) => cue.id),
			'engine-v2-retry-on-fail',
		]);
		expect(cueText(cues, 'tool-names')).toBe(cueText(WORKFLOW_BUILDER_CUES, 'tool-names'));
		expect(cues.isActive).toBe(WORKFLOW_BUILDER_CUES.isActive);
	});

	it('keeps the v1 text for a setting that the engine check no longer blocks', async () => {
		vi.resetModules();
		vi.doMock('@n8n/workflow-sdk/prompts/sdk-reference', async (importOriginal) => {
			const actual =
				await importOriginal<typeof import('@n8n/workflow-sdk/prompts/sdk-reference')>();
			return {
				...actual,
				// Engine v2 supports everything but Execute Once.
				getBlockedEngineV2NodeSettingRules: () => ({
					EXECUTE_ONCE: actual.ENGINE_V2_NODE_SETTING_RULES.EXECUTE_ONCE,
				}),
			};
		});
		const fresh = await import('../context-cues/workflow-builder.cues.js');
		const cues = fresh.getWorkflowBuilderCues({ engineV2Available: true, newWorkflowEngine: 'v2' });

		expect(cueText(cues, 'execute-once')).toContain('On engine v2:');
		for (const id of [
			'zero-items-end-branch',
			'always-output-data-empty-json',
			'on-error-one-handler',
		]) {
			expect(cueText(cues, id)).toBe(cueText(fresh.WORKFLOW_BUILDER_CUES, id));
		}
		expect(cueText(cues, 'engine-v2-retry-on-fail')).toBeUndefined();
		vi.doUnmock('@n8n/workflow-sdk/prompts/sdk-reference');
	});
});
