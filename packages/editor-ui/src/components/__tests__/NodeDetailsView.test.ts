import NodeDetailsView from '@/components/NodeDetailsView.vue';
import { createTestingPinia } from '@pinia/testing';
import { STORES, WEBHOOK_NODE_TYPE } from '@/constants';
import { createComponentRenderer } from '@/__tests__/render';
import { waitFor } from '@testing-library/vue';

const renderComponent = createComponentRenderer(NodeDetailsView, {
	props: {
		teleported: false,
		appendToBody: false,
	},
	pinia: createTestingPinia({
		initialState: {
			[STORES.WORKFLOWS]: {
				workflow: {
					nodes: [{ type: WEBHOOK_NODE_TYPE }],
				},
			},
		},
	}),
});

describe('NodeDetailsView', () => {
	it('should render correctly', async () => {
		const wrapper = renderComponent();

		await waitFor(() =>
			expect(wrapper.container.querySelector('.modal-content')).toBeInTheDocument(),
		);
	});
});
