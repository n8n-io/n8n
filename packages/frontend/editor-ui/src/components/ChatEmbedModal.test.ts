import ChatEmbedModal from '@/components/ChatEmbedModal.vue';
import { createTestingPinia } from '@pinia/testing';
import { CHAT_EMBED_MODAL_KEY, WEBHOOK_NODE_TYPE } from '@/constants';
import { STORES } from '@n8n/stores';
import { createComponentRenderer } from '@/__tests__/render';
import { waitFor } from '@testing-library/vue';
import { cleanupAppModals, createAppModals } from '@/__tests__/utils';

const renderComponent = createComponentRenderer(ChatEmbedModal, {
	props: {
		teleported: false,
		appendToBody: false,
	},
	pinia: createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modalsById: {
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
	beforeEach(() => {
		createAppModals();
	});

	afterEach(() => {
		cleanupAppModals();
	});
	it('should render correctly', async () => {
		const { getByTestId } = renderComponent();

		await waitFor(() => expect(getByTestId('chatEmbed-modal')).toBeInTheDocument());

		const modalContainer = getByTestId('chatEmbed-modal');
		const tabs = modalContainer.querySelectorAll('.n8n-tabs .tab');
		const activeTab = modalContainer.querySelector('.n8n-tabs .tab.activeTab');
		const editor = modalContainer.querySelector('.cm-editor');

		expect(tabs).toHaveLength(4);
		expect(activeTab).toBeVisible();
		expect(activeTab).toHaveTextContent('CDN Embed');
		expect(editor).toBeVisible();
	});
});
