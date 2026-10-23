import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { mockNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import { renderComponent } from '@/__tests__/render';
import * as workflowHelpers from '@/app/composables/useWorkflowHelpers';
import { WEBHOOK_NODE_TYPE } from '@/app/constants';
import NodeWebhooks from './NodeWebhooks.vue';

const useWorkflowHelpers = workflowHelpers.useWorkflowHelpers;
const longUrl = `https://example.com/webhook/${'a'.repeat(200)}`;

describe('NodeWebhooks', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each([
		{ httpMethod: 'GET', url: 'https://example.com/webhook/test', hideMethod: false },
		{ httpMethod: 'DELETE', url: longUrl, hideMethod: false },
		{ httpMethod: 'GET', url: longUrl, hideMethod: true },
	])(
		'should keep the complete URL in the shared row with hideMethod=$hideMethod and $httpMethod',
		async ({ httpMethod, url, hideMethod }) => {
			const pinia = createTestingPinia();
			const getWebhookUrl = vi.fn(async () => url);
			const helperSpy = vi.spyOn(workflowHelpers, 'useWorkflowHelpers').mockImplementation(() => ({
				...useWorkflowHelpers(),
				getWebhookUrl,
				getWebhookExpressionValue: async () => httpMethod,
			}));

			const { findByText, container } = renderComponent(NodeWebhooks, {
				pinia,
				props: {
					node: mockNode({ name: 'Webhook', type: WEBHOOK_NODE_TYPE }),
					nodeTypeDescription: mockNodeTypeDescription({
						name: WEBHOOK_NODE_TYPE,
						webhooks: [
							{
								name: 'default',
								httpMethod,
								responseMode: 'onReceived',
								path: 'test',
								ndvHideUrl: false,
								restartWebhook: false,
								ndvHideMethod: hideMethod,
							},
						],
					}),
				},
			});

			await flushPromises();
			expect(helperSpy).toHaveBeenCalled();
			expect(getWebhookUrl).toHaveBeenCalled();
			const urlElement = await findByText(url);
			const row = urlElement.closest('.webhook-wrapper');

			expect(row).not.toBeNull();
			expect(urlElement.parentElement).toHaveClass('url-field');
			expect(row?.querySelectorAll('br')).toHaveLength(0);
			expect(container.querySelectorAll('.webhook-wrapper')).toHaveLength(1);

			if (hideMethod) {
				expect(row?.querySelector('.http-field')).toBeNull();
				expect(row?.children).toHaveLength(1);
			} else {
				expect(row?.querySelector('.http-method')).toHaveTextContent(httpMethod);
				expect(row?.children).toHaveLength(2);
			}
		},
	);
});
