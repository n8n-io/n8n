import ChatEmbedModal from '@/components/ChatEmbedModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { CHAT_EMBED_MODAL_KEY, STORES, WEBHOOK_NODE_TYPE } from '@/constants';
import { createComponentRenderer } from '@/__tests__/render';
import { waitFor } from '@testing-library/vue';

const renderComponent = createComponentRenderer(ChatEmbedModal, {
	props: {
		teleported: false,
		appendToBody: false,
	},
	pinia: createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modals: {
					[CHAT_EMBED_MODAL_KEY]: { open: true },
				},
			},
			[STORES.WORKFLOWS]: {
				workflow: {
					nodes: [{ type: WEBHOOK_NODE_TYPE }],
				},
			},
		},
	}),
});

describe('ChatEmbedModal', () => {
	it('should render correctly', async () => {
		const wrapper = renderComponent();

		await waitFor(() =>
			expect(wrapper.container.querySelector('.modal-content')).toBeInTheDocument(),
		);

		const tabs = wrapper.container.querySelectorAll('.n8n-tabs .tab');
		const activeTab = wrapper.container.querySelector('.n8n-tabs .tab.activeTab');
		const editor = wrapper.container.querySelector('.cm-editor');

		expect(tabs).toHaveLength(4);
		expect(activeTab).toBeVisible();
		expect(activeTab).toHaveTextContent('CDN Embed');
		expect(editor).toBeVisible();
	});
});
