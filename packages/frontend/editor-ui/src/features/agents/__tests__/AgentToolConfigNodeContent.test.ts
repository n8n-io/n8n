import { describe, it, expect } from 'vitest';
import type { INode } from 'n8n-workflow';
import { inject } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { ResourceMapperSchemaAutoRefreshKey } from '@/app/constants';
import AgentToolConfigNodeContent from '../components/AgentToolConfigNodeContent.vue';

const renderComponent = createComponentRenderer(AgentToolConfigNodeContent, {
	global: {
		stubs: {
			NodeToolSettingsContent: {
				template:
					'<div data-test-id="node-tool-settings" :data-schema-auto-refresh="schemaAutoRefreshEnabled">{{ JSON.stringify(hiddenOperations) }}</div>',
				props: ['initialNode', 'existingToolNames', 'projectId', 'hiddenOperations'],
				setup() {
					return {
						schemaAutoRefreshEnabled: inject(ResourceMapperSchemaAutoRefreshKey, true),
					};
				},
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

	it('disables automatic resource mapper schema refreshes', () => {
		const { container } = renderComponent({ props: { initialNode: node } });

		expect(container.querySelector('[data-schema-auto-refresh]')).toHaveAttribute(
			'data-schema-auto-refresh',
			'false',
		);
	});
});
