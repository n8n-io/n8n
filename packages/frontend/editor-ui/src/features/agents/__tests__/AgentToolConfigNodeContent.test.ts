import { describe, it, expect } from 'vitest';
import type { INode } from 'n8n-workflow';

import { createComponentRenderer } from '@/__tests__/render';
import AgentToolConfigNodeContent from '../components/AgentToolConfigNodeContent.vue';

const renderComponent = createComponentRenderer(AgentToolConfigNodeContent, {
	global: {
		stubs: {
			NodeToolSettingsContent: {
				template:
					'<div data-test-id="node-tool-settings">{{ JSON.stringify(hiddenOperations) }}</div>',
				props: ['initialNode', 'existingToolNames', 'projectId', 'hiddenOperations'],
			},
		},
	},
});

const node: INode = {
	id: 'node-1',
	name: 'Slack',
	type: 'n8n-nodes-base.slackTool',
	typeVersion: 2.2,
	position: [0, 0],
	parameters: {},
};

describe('AgentToolConfigNodeContent', () => {
	it('hides waiting operations unsupported by inline agent tool execution', () => {
		const { container } = renderComponent({ props: { initialNode: node } });

		const hiddenOperations = container.textContent ?? '';
		expect(hiddenOperations).toContain('sendAndWait');
		expect(hiddenOperations).toContain('dispatchAndWait');
	});
});
