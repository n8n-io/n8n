import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import type { INode } from 'n8n-workflow';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { STORES } from '@n8n/stores';

vi.mock('@/features/ai/assistant/assistant.api', () => ({
	generateCodeForPrompt: vi.fn(),
}));

vi.mock('@/features/ndv/parameters/utils/buttonParameter.utils', () => ({
	getSchemas: vi.fn(() => ({
		parentNodesSchemas: [],
		inputSchema: undefined,
		parentNodesNames: [],
	})),
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: vi.fn(() =>
		ref({
			documentId: 'wf@latest',
		}),
	),
}));

vi.mock('@/features/ndv/shared/ndv.store', () => ({
	injectNDVStore: vi.fn(() =>
		ref({
			pushRef: 'ndv-ref',
		}),
	),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		pushRef: 'root-ref',
		restApiContext: { baseUrl: 'http://localhost', pushRef: 'root-ref' },
	})),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showError: vi.fn(),
	})),
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({
		track: vi.fn(),
	})),
}));

const getNodeType = vi.fn();

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getNodeType,
	})),
}));

import { generateCodeForPrompt } from '@/features/ai/assistant/assistant.api';
import { useGenerateMockData } from './useGenerateMockData';

const integrationNode = ref<INode | null>({
	id: '1',
	name: 'Slack',
	type: 'n8n-nodes-base.slack',
	typeVersion: 2,
	position: [0, 0],
	parameters: { resource: 'message' },
});

const coreNode = ref<INode | null>({
	id: '2',
	name: 'Edit Fields',
	type: 'n8n-nodes-base.set',
	typeVersion: 3,
	position: [0, 0],
	parameters: {},
});

const setSettings = (askAi: { enabled: boolean; setup: boolean }) => {
	setActivePinia(
		createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: { askAi },
				},
			},
		}),
	);
};

describe('useGenerateMockData', () => {
	beforeEach(() => {
		setSettings({ enabled: true, setup: true });
		vi.mocked(generateCodeForPrompt).mockReset();
		getNodeType.mockReset();
		getNodeType.mockReturnValue({ credentials: [{ name: 'slackApi', required: true }] });
	});

	it('is disabled when licensed but the AI proxy is not configured', () => {
		setSettings({ enabled: true, setup: false });

		const { isGenerateMockDataEnabled } = useGenerateMockData(integrationNode);

		expect(isGenerateMockDataEnabled.value).toBe(false);
	});

	it('is enabled for external integration nodes when Ask AI is available', () => {
		const { isGenerateMockDataEnabled } = useGenerateMockData(integrationNode);

		expect(isGenerateMockDataEnabled.value).toBe(true);
	});

	it('is disabled for core nodes without credentials', () => {
		getNodeType.mockReturnValue({ credentials: [] });

		const { isGenerateMockDataEnabled } = useGenerateMockData(coreNode);

		expect(isGenerateMockDataEnabled.value).toBe(false);
	});

	it('calls ask-ai for success and parses the response', async () => {
		vi.mocked(generateCodeForPrompt).mockResolvedValue({
			code: '```json\n[{"id":1}]\n```',
		});

		const { mode, generate } = useGenerateMockData(integrationNode);
		mode.value = 'success';

		const result = await generate();

		expect(generateCodeForPrompt).toHaveBeenCalledTimes(1);
		expect(vi.mocked(generateCodeForPrompt).mock.calls[0][1].forNode).toBe('code');
		expect(result).toEqual([{ id: 1 }]);
	});

	it('uses success path when describe has empty scenario text', async () => {
		vi.mocked(generateCodeForPrompt).mockResolvedValue({
			code: '[{"ok":true}]',
		});

		const { mode, scenarioText, generate } = useGenerateMockData(integrationNode);
		mode.value = 'describe';
		scenarioText.value = '';

		await generate();

		const question = vi.mocked(generateCodeForPrompt).mock.calls[0][1].question;
		expect(question).toContain('SUCCESS');
	});
});
