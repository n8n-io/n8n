/**
 * The engine section exists only with the `engine-v2` module. Without the module, the
 * prompt must stay byte-identical, so instances without v2 keep their prompt cache.
 */

import { getEngineV2BuildRules } from '@n8n/workflow-sdk/prompts/sdk-reference';

import { getSystemPrompt } from '../system-prompt';
import { getWorkflowEngineSection } from '../workflow-engine-prompt';

describe('getSystemPrompt — workflow engine', () => {
	it('does not change the prompt without the engine-v2 module', () => {
		const withoutSetup = getSystemPrompt({ projectId: 'p1' });

		expect(
			getSystemPrompt({
				projectId: 'p1',
				engineSetup: { engineV2Available: false, newWorkflowEngine: 'v1' },
			}),
		).toBe(withoutSetup);
		expect(withoutSetup).not.toContain('## Workflow Engine');
		expect(withoutSetup).not.toContain('engineType');
	});

	it('adds the engine section with v1 as the default for new workflows', () => {
		const prompt = getSystemPrompt({
			engineSetup: { engineV2Available: true, newWorkflowEngine: 'v1' },
		});

		expect(prompt).toContain('## Workflow Engine');
		expect(prompt).toContain('New workflows run on engine v1.');
		expect(prompt).toContain('Keep an existing workflow on its engine.');
		expect(prompt).toContain(
			'Do not set `engineType` on a new workflow, unless the user asks for an engine.',
		);
		// A new workflow already gets v1, so the prompt does not tell the model to opt out.
		expect(prompt).not.toContain("`workflow('id', 'Name', { engineType: 'v1' })`");
		expect(prompt).toContain('ask the user before you move it to engine v1');
		expect(prompt).toContain(getEngineV2BuildRules());
	});

	it('adds the engine section with v2 as the default for new workflows', () => {
		const prompt = getSystemPrompt({
			engineSetup: { engineV2Available: true, newWorkflowEngine: 'v2' },
		});

		expect(prompt).toContain('New workflows run on engine v2.');
		expect(prompt).toContain('add a Limit node (1 item) before this node');
		expect(prompt).toContain("`onError: 'continueRegularOutput'` is v2-safe");
		expect(prompt).toContain('`n8n-nodes-base.formTrigger`');
		expect(prompt).toContain('every node whose type starts with `@n8n/n8n-nodes-langchain.`');
		expect(prompt).toContain('ask the user before you move it to engine v1');
	});

	it('lets a new workflow on a v2 default opt out to engine v1', () => {
		const prompt = getSystemPrompt({
			engineSetup: { engineV2Available: true, newWorkflowEngine: 'v2' },
		});

		// The rule against `engineType` on a new workflow must allow the v1 opt-out.
		expect(prompt).toContain(
			'Do not set `engineType` on a new workflow, unless the user asks for an engine or the workflow needs engine v1.',
		);
		expect(prompt).toContain("`workflow('id', 'Name', { engineType: 'v1' })`");
	});

	it('changes nothing else in the prompt', () => {
		const engineSetup = { engineV2Available: true, newWorkflowEngine: 'v2' } as const;
		const withEngine = getSystemPrompt({ engineSetup });

		expect(withEngine.replace(getWorkflowEngineSection(engineSetup), '')).toBe(getSystemPrompt({}));
	});
});
