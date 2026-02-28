import { ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';

import { createTestNode } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { INodeUi } from '@/Interface';
import type { IWebhookDescription, WebhookType } from 'n8n-workflow';

import { useWebhookUrls } from '@/features/setupPanel/composables/useWebhookUrls';

const mockGetWebhookUrl = vi.fn();
const mockGetWebhookExpressionValue = vi.fn();

vi.mock('@/app/composables/useWorkflowHelpers', () => ({
	useWorkflowHelpers: vi.fn(() => ({
		getWebhookUrl: mockGetWebhookUrl,
		getWebhookExpressionValue: mockGetWebhookExpressionValue,
	})),
}));

const createNode = (overrides: Partial<INodeUi> = {}): INodeUi =>
	createTestNode({
		name: 'Webhook',
		type: 'n8n-nodes-base.webhook',
		typeVersion: 1,
		position: [0, 0],
		...overrides,
	}) as INodeUi;

const createWebhook = (overrides: Partial<IWebhookDescription> = {}): IWebhookDescription => ({
	httpMethod: 'GET',
	name: 'default' as WebhookType,
	responseMode: 'onReceived',
	path: '/test',
	...overrides,
});

describe('useWebhookUrls', () => {
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		nodeTypesStore = mockedStore(useNodeTypesStore);
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue(null);
	});

	it('should return empty array when node is null', async () => {
		const node = ref<INodeUi | null>(null);
		const { webhookUrls } = useWebhookUrls(node);

		await vi.dynamicImportSettled();

		expect(webhookUrls.value).toEqual([]);
	});

	it('should return empty array when node type has no webhooks', async () => {
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue({ webhooks: undefined });
		const node = ref<INodeUi | null>(createNode());
		const { webhookUrls } = useWebhookUrls(node);

		await vi.dynamicImportSettled();

		expect(webhookUrls.value).toEqual([]);
	});

	it('should filter out restartWebhook entries', async () => {
		const webhooks = [createWebhook({ restartWebhook: true }), createWebhook({ path: '/actual' })];
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue({ webhooks });
		mockGetWebhookUrl.mockResolvedValue('http://localhost/test/actual');
		mockGetWebhookExpressionValue.mockResolvedValue('GET');

		const node = ref<INodeUi | null>(createNode());
		const { webhookUrls } = useWebhookUrls(node);

		await vi.dynamicImportSettled();

		expect(webhookUrls.value).toHaveLength(1);
		expect(webhookUrls.value[0].url).toBe('http://localhost/test/actual');
	});

	it('should resolve webhook URL in test mode', async () => {
		const webhook = createWebhook();
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue({ webhooks: [webhook] });
		mockGetWebhookUrl.mockResolvedValue('http://localhost/test/webhook');
		mockGetWebhookExpressionValue.mockResolvedValue('POST');

		const testNode = createNode();
		const node = ref<INodeUi | null>(testNode);
		const { webhookUrls } = useWebhookUrls(node);

		await vi.dynamicImportSettled();

		expect(mockGetWebhookUrl).toHaveBeenCalledWith(webhook, testNode, 'test');
		expect(webhookUrls.value).toEqual([
			{ url: 'http://localhost/test/webhook', httpMethod: 'POST', isMethodVisible: true },
		]);
	});

	it('should hide webhook when ndvHideUrl is true', async () => {
		const webhook = createWebhook({ ndvHideUrl: true });
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue({ webhooks: [webhook] });

		const node = ref<INodeUi | null>(createNode());
		const { webhookUrls } = useWebhookUrls(node);

		await vi.dynamicImportSettled();

		expect(webhookUrls.value).toEqual([]);
	});

	it('should evaluate ndvHideUrl expression when it is a string', async () => {
		const webhook = createWebhook({ ndvHideUrl: '={{ true }}' as unknown as boolean });
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue({ webhooks: [webhook] });
		mockGetWebhookExpressionValue.mockImplementation(async (_w, key) => {
			if (key === 'ndvHideUrl') return true;
			return 'GET';
		});

		const node = ref<INodeUi | null>(createNode());
		const { webhookUrls } = useWebhookUrls(node);

		await vi.dynamicImportSettled();

		expect(webhookUrls.value).toEqual([]);
	});

	it('should show webhook when ndvHideUrl expression evaluates to false', async () => {
		const webhook = createWebhook({ ndvHideUrl: '={{ false }}' as unknown as boolean });
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue({ webhooks: [webhook] });
		mockGetWebhookUrl.mockResolvedValue('http://localhost/test/webhook');
		mockGetWebhookExpressionValue.mockImplementation(async (_w, key) => {
			if (key === 'ndvHideUrl') return false;
			return 'GET';
		});

		const node = ref<INodeUi | null>(createNode());
		const { webhookUrls } = useWebhookUrls(node);

		await vi.dynamicImportSettled();

		expect(webhookUrls.value).toHaveLength(1);
	});

	it('should hide method when httpMethod resolves to multiple methods', async () => {
		const webhook = createWebhook();
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue({ webhooks: [webhook] });
		mockGetWebhookUrl.mockResolvedValue('http://localhost/test/webhook');
		mockGetWebhookExpressionValue.mockResolvedValue(['GET', 'POST']);

		const node = ref<INodeUi | null>(createNode());
		const { webhookUrls } = useWebhookUrls(node);

		await vi.dynamicImportSettled();

		expect(webhookUrls.value).toEqual([
			{ url: 'http://localhost/test/webhook', httpMethod: '', isMethodVisible: false },
		]);
	});

	it('should extract first method from single-element array', async () => {
		const webhook = createWebhook();
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue({ webhooks: [webhook] });
		mockGetWebhookUrl.mockResolvedValue('http://localhost/test/webhook');
		mockGetWebhookExpressionValue.mockResolvedValue(['POST']);

		const node = ref<INodeUi | null>(createNode());
		const { webhookUrls } = useWebhookUrls(node);

		await vi.dynamicImportSettled();

		expect(webhookUrls.value[0].httpMethod).toBe('POST');
		expect(webhookUrls.value[0].isMethodVisible).toBe(true);
	});

	it('should hide method when ndvHideMethod is true', async () => {
		const webhook = createWebhook({ ndvHideMethod: true });
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue({ webhooks: [webhook] });
		mockGetWebhookUrl.mockResolvedValue('http://localhost/test/webhook');
		mockGetWebhookExpressionValue.mockResolvedValue('GET');

		const node = ref<INodeUi | null>(createNode());
		const { webhookUrls } = useWebhookUrls(node);

		await vi.dynamicImportSettled();

		expect(webhookUrls.value[0].isMethodVisible).toBe(false);
	});

	it('should evaluate ndvHideMethod expression', async () => {
		const webhook = createWebhook({
			ndvHideMethod: '={{ true }}' as unknown as boolean,
		});
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue({ webhooks: [webhook] });
		mockGetWebhookUrl.mockResolvedValue('http://localhost/test/webhook');
		mockGetWebhookExpressionValue.mockImplementation(async (_w, key) => {
			if (key === 'ndvHideMethod') return true;
			if (key === 'httpMethod') return 'GET';
			return '';
		});

		const node = ref<INodeUi | null>(createNode());
		const { webhookUrls } = useWebhookUrls(node);

		await vi.dynamicImportSettled();

		expect(webhookUrls.value[0].isMethodVisible).toBe(false);
	});

	it('should resolve multiple webhooks', async () => {
		const webhooks = [createWebhook({ path: '/hook1' }), createWebhook({ path: '/hook2' })];
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue({ webhooks });
		mockGetWebhookUrl
			.mockResolvedValueOnce('http://localhost/test/hook1')
			.mockResolvedValueOnce('http://localhost/test/hook2');
		mockGetWebhookExpressionValue.mockResolvedValue('GET');

		const node = ref<INodeUi | null>(createNode());
		const { webhookUrls } = useWebhookUrls(node);

		await vi.dynamicImportSettled();

		expect(webhookUrls.value).toHaveLength(2);
		expect(webhookUrls.value[0].url).toBe('http://localhost/test/hook1');
		expect(webhookUrls.value[1].url).toBe('http://localhost/test/hook2');
	});

	it('should keep defaults when httpMethod expression throws', async () => {
		const webhook = createWebhook();
		nodeTypesStore.getNodeType = vi.fn().mockReturnValue({ webhooks: [webhook] });
		mockGetWebhookUrl.mockResolvedValue('http://localhost/test/webhook');
		mockGetWebhookExpressionValue.mockRejectedValue(new Error('Expression error'));

		const node = ref<INodeUi | null>(createNode());
		const { webhookUrls } = useWebhookUrls(node);

		await vi.dynamicImportSettled();

		expect(webhookUrls.value).toEqual([
			{ url: 'http://localhost/test/webhook', httpMethod: '', isMethodVisible: true },
		]);
	});
});
