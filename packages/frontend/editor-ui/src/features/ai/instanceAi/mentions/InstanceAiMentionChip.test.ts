import { fireEvent } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';

import { renderComponent } from '@/__tests__/render';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import { buildDraftMention } from './buildMentionAttachment';
import InstanceAiMentionChip from './InstanceAiMentionChip.vue';

describe('InstanceAiMentionChip', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		useNodeTypesStore().setNodeTypes([
			mock<INodeTypeDescription>({
				version: 1,
				name: 'n8n-nodes-base.set',
				displayName: 'Edit Fields',
				iconUrl: 'icons/n8n-nodes-base/dist/nodes/Set/set.svg',
			}),
		]);
	});

	it('renders a real node icon and a named removal action', () => {
		const mention = buildDraftMention(
			{
				kind: 'node',
				workflowId: 'workflow-1',
				workflowName: 'Support triage',
				node: {
					id: 'node-1',
					name: 'Route request',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
				},
			},
			'typed',
		);
		const { getByTestId, getByRole } = renderComponent(InstanceAiMentionChip, {
			props: { mention },
		});

		expect(
			getByTestId('instance-ai-mention-chip-node').querySelector('.n8n-node-icon img'),
		).toBeTruthy();
		expect(getByRole('button', { name: 'Remove node mention Route request' })).toBeInTheDocument();
	});

	it.each(['Backspace', 'Delete'])('removes the focused chip with %s', async (key) => {
		const mention = buildDraftMention(
			{ kind: 'workflow', workflowId: 'workflow-1', workflowName: 'Support triage' },
			'button',
		);
		const { getByTestId, emitted } = renderComponent(InstanceAiMentionChip, {
			props: { mention },
		});

		await fireEvent.keyDown(getByTestId('instance-ai-mention-chip-workflow'), { key });

		expect(emitted().remove).toBeTruthy();
	});
});
