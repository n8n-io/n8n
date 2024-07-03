import { createComponentRenderer } from '@/__tests__/render';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import NodeErrorView from '@/components/Error/NodeErrorView.vue';
import { STORES } from '@/constants';
import { createTestingPinia } from '@pinia/testing';
import { type INode } from 'n8n-workflow';

const DEFAULT_SETUP = {
	pinia: createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: SETTINGS_STORE_DEFAULT_STATE,
		},
	}),
};

const renderComponent = createComponentRenderer(NodeErrorView, DEFAULT_SETUP);

describe('NodeErrorView.vue', () => {
	let mockNode: INode;
	afterEach(() => {
		mockNode = {
			parameters: {
				mode: 'runOnceForAllItems',
				language: 'javaScript',
				jsCode: 'cons error = 9;',
				notice: '',
			},
			id: 'd1ce5dc9-f9ae-4ac6-84e5-0696ba175dd9',
			name: 'Code',
			type: 'n8n-nodes-base.code',
			typeVersion: 2,
			position: [940, 240],
		};
		vi.clearAllMocks();
	});

	it('renders an Error with a messages array', async () => {
		const { getByTestId } = renderComponent({
			props: {
				error: {
					node: mockNode,
					messages: ['Unexpected identifier [line 1]'],
				},
			},
		});

		const errorMessage = getByTestId('node-error-message');

		expect(errorMessage).toHaveTextContent('Unexpected identifier [line 1]');
	});

	it('renders an Error with a message string', async () => {
		const { getByTestId } = renderComponent({
			props: {
				error: {
					node: mockNode,
					message: 'Unexpected identifier [line 1]',
				},
			},
		});

		const errorMessage = getByTestId('node-error-message');

		expect(errorMessage).toHaveTextContent('Unexpected identifier [line 1]');
	});
});
