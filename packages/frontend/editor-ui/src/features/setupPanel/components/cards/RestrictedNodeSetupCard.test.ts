import { createComponentRenderer } from '@/__tests__/render';
import { createTestNode } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import RestrictedNodeSetupCard from '@/features/setupPanel/components/cards/RestrictedNodeSetupCard.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { nodeViewEventBus } from '@/app/event-bus';
import type { INodeUi } from '@/Interface';

vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: {
		template: '<div data-test-id="node-icon" :data-disabled="disabled"></div>',
		props: { nodeType: Object, size: Number, disabled: Boolean },
	},
}));

const renderComponent = createComponentRenderer(RestrictedNodeSetupCard);

const node = createTestNode({
	id: 'gmail-1',
	name: 'New email',
	type: 'n8n-nodes-base.gmailTrigger',
}) as INodeUi;

const render = (expanded = true) =>
	renderComponent({
		props: {
			node,
			restriction: { name: node.type, available: false, scope: 'instance' },
			isTrigger: true,
			expanded,
		},
	});

describe('RestrictedNodeSetupCard', () => {
	beforeEach(() => {
		createTestingPinia();
		mockedStore(useNodeTypesStore).getNodeType = vi
			.fn()
			.mockReturnValue({ displayName: 'Gmail Trigger' });
	});

	it('shows a greyed icon, the restricted badge, the reason and the two actions', () => {
		const { getByTestId } = render();

		expect(getByTestId('node-icon')).toHaveAttribute('data-disabled');
		expect(getByTestId('setup-card-restricted-badge')).toHaveTextContent('Restricted');
		expect(getByTestId('setup-card-restricted-description')).toHaveTextContent(
			'Gmail Trigger is restricted on this instance. Replace it to save the workflow.',
		);
		expect(getByTestId('setup-card-contact-admin')).toHaveTextContent('Contact instance admin');
		expect(getByTestId('setup-card-replace-node')).toHaveTextContent('Replace node');
	});

	it('never shows the card as complete', () => {
		const { queryByTestId } = render(false);

		expect(queryByTestId('restricted-node-setup-card-complete-icon')).not.toBeInTheDocument();
	});

	it('asks the canvas to replace the node', async () => {
		const onReplaceNode = vi.fn();
		nodeViewEventBus.on('replaceNode', onReplaceNode);
		const { getByTestId } = render();

		await userEvent.click(getByTestId('setup-card-replace-node'));

		expect(onReplaceNode).toHaveBeenCalledWith('gmail-1');
		nodeViewEventBus.off('replaceNode', onReplaceNode);
	});
});
