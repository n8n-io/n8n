import { describe, it, expect } from 'vitest';
import { getEasyAiWorkflowJson } from './easyAiWorkflowUtils';

describe('getEasyAiWorkflowJson', () => {
	it('should update sticky note content for AI free credits experiment', () => {
		const workflow = getEasyAiWorkflowJson({
			isInstanceInAiFreeCreditsExperiment: true,
			withOpenAiFreeCredits: 25,
		});

		if (!workflow?.nodes) fail();

		const stickyNote = workflow.nodes.find(
			(node) => node.type === 'n8n-nodes-base.stickyNote' && node.name === 'Sticky Note',
		);

		expect(stickyNote?.parameters.content).toContain(
			'Claim your `free` 25 OpenAI calls in the `OpenAI model` node',
		);
	});

	it('should show default content when not in AI free credits experiment', () => {
		const workflow = getEasyAiWorkflowJson({
			isInstanceInAiFreeCreditsExperiment: false,
			withOpenAiFreeCredits: 0,
		});

		if (!workflow?.nodes) fail();

		const stickyNote = workflow.nodes.find(
			(node) => node.type === 'n8n-nodes-base.stickyNote' && node.name === 'Sticky Note',
		);

		expect(stickyNote?.parameters.content).toContain(
			'Set up your [OpenAI credentials](https://docs.n8n.io/integrations/builtin/credentials/openai/?utm_source=n8n_app&utm_medium=credential_settings&utm_campaign=create_new_credentials_modal) in the `OpenAI Model` node',
		);
	});
});
