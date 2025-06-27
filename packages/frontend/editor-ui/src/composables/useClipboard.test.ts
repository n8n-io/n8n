import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { defineComponent, h, ref } from 'vue';
import { useClipboard } from '@/composables/useClipboard';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import * as nodeHelpers from '@/composables/useNodeHelpers';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import { jsonParse } from 'n8n-workflow';

describe('Copy node to clipboard', () => {
	const nodeToCopy =
		'{"nodes":[{"parameters":{"authentication":"oAuth2","owner":{"__rl":true,"value":"n8n","mode":"name"},"repository":{"__rl":true,"value":"https://github.com/n8n-io/n8n/","mode":"url"},"events":["push"],"options":{}},"type":"n8n-nodes-base.githubTrigger","typeVersion":1,"position":[840,560],"id":"9895b4c4-ae2b-4160-96fe-38accdfda457","name":"Github Trigger1","webhookId":"06172090-bb04-49c5-8925-66020f11aa8b","credentials":{"githubOAuth2Api":{"id":"VtN0PyhaVg54NZn1","name":"GitHub account OAuth2"}}}],"connections":{},"pinData":{},"meta":{"templateCredsSetupCompleted":true,"instanceId":"ee90fdf8d57662f949e6c691dc07fa0fd2f66e1eee28ed82ef06658223e67255"}}';

	const NodeComponent = defineComponent({
		setup() {
			const pasted = ref('');
			const clipboard = useClipboard({
				onPaste(data) {
					pasted.value = data;
				},
			});

			return () =>
				h('div', [
					h('button', {
						'data-test-id': 'copy',
						onClick: () => {
							void clipboard.copy(nodeToCopy);
						},
					}),
					h('div', { 'data-test-id': 'paste' }, pasted.value),
				]);
		},
	});

	describe('useClipboard()', () => {
		let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;

		beforeAll(() => {
			userEvent.setup();
		});

		beforeEach(() => {
			const pinia = createTestingPinia();
			setActivePinia(pinia);

			nodeTypesStore = useNodeTypesStore();

			// Mock document.execCommand implementation to set clipboard items
			document.execCommand = vi.fn().mockImplementation((command) => {
				if (command === 'copy') {
					Object.defineProperty(window.navigator, 'clipboard', {
						value: { items: [nodeToCopy] },
						configurable: true,
					});
				}
				return true;
			});
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		describe('copy()', () => {
			it('should copy text value', async () => {
				const { getByTestId } = render(NodeComponent);

				const copyButton = getByTestId('copy');
				await userEvent.click(copyButton);
				expect((window.navigator.clipboard as unknown as { items: string[] }).items).toHaveLength(
					1,
				);
			});
		});

		describe('onClipboardPasteEvent()', () => {
			it('should trigger on clipboard paste event', async () => {
				const webhookId = window.crypto.randomUUID();
				const id = window.crypto.randomUUID();

				const originalNodeHelpers = nodeHelpers.useNodeHelpers();

				vi.spyOn(nodeHelpers, 'useNodeHelpers').mockImplementation(() => {
					return {
						...originalNodeHelpers,
						assignWebhookId: (node: INodeUi) => {
							node.webhookId = webhookId;
							return webhookId;
						},
						assignNodeId: (node: INodeUi) => {
							node.id = id;
							return id;
						},
					};
				});

				const nodeValue = jsonParse<IWorkflowDb>(nodeToCopy);
				nodeValue.nodes[0].webhookId = webhookId;
				nodeValue.nodes[0].id = id;

				const { getByTestId } = render(NodeComponent);

				const pasteElement = getByTestId('paste');
				await userEvent.paste(nodeToCopy);

				expect(pasteElement.textContent).toEqual(JSON.stringify(nodeValue));
			});
		});
	});
});

describe('Copy sticky to clipboard', () => {
	const nodeToCopy =
		'{"nodes":[{"parameters":{},"type":"n8n-nodes-base.stickyNote","typeVersion":1,"position":[340,640],"id":"e798f9f8-2274-403a-acdf-964198b45fef","name":"Sticky Note2"}],"connections":{},"pinData":{},"meta":{"templateCredsSetupCompleted":true,"instanceId":"ee90fdf8d57662f949e6c691dc07fa0fd2f66e1eee28ed82ef06658223e67255"}}';

	const NodeComponent = defineComponent({
		setup() {
			const pasted = ref('');
			const clipboard = useClipboard({
				onPaste(data) {
					pasted.value = data;
				},
			});

			return () =>
				h('div', [
					h('button', {
						'data-test-id': 'copy',
						onClick: () => {
							void clipboard.copy(nodeToCopy);
						},
					}),
					h('div', { 'data-test-id': 'paste' }, pasted.value),
				]);
		},
	});

	describe('useClipboard()', () => {
		let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;

		beforeAll(() => {
			userEvent.setup();
		});

		beforeEach(() => {
			const pinia = createTestingPinia();
			setActivePinia(pinia);

			nodeTypesStore = useNodeTypesStore();

			// Mock document.execCommand implementation to set clipboard items
			document.execCommand = vi.fn().mockImplementation((command) => {
				if (command === 'copy') {
					Object.defineProperty(window.navigator, 'clipboard', {
						value: { items: [nodeToCopy] },
						configurable: true,
					});
				}
				return true;
			});
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		describe('copy()', () => {
			it('should copy text value', async () => {
				const { getByTestId } = render(NodeComponent);

				const copyButton = getByTestId('copy');
				await userEvent.click(copyButton);
				expect((window.navigator.clipboard as unknown as { items: string[] }).items).toHaveLength(
					1,
				);
			});
		});

		describe('onClipboardPasteEvent()', () => {
			it('should trigger on clipboard paste event', async () => {
				const nodeValue = jsonParse<IWorkflowDb>(nodeToCopy);
				const { getByTestId } = render(NodeComponent);

				const pasteElement = getByTestId('paste');
				await userEvent.paste(nodeToCopy);

				expect(pasteElement.textContent).toEqual(JSON.stringify(nodeValue));
			});
		});
	});
});
