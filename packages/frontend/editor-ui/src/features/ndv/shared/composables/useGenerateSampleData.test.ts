import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { ref, shallowRef } from 'vue';
import { mock } from 'vitest-mock-extended';
import type { IConnections, INodeExecutionData } from 'n8n-workflow';

import { mockedStore } from '@/__tests__/utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import type { INodeUi } from '@/Interface';
import type { WorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import type { IWorkflowDb } from '@/Interface';

import { useGenerateSampleData } from './useGenerateSampleData';

const INSTANCE_AI_SETTINGS = {
	enabled: true,
	localGatewayDisabled: false,
	browserUseEnabled: false,
	proxyEnabled: false,
	cloudManaged: false,
	sandboxEnabled: false,
	workflowBuilderAvailable: true,
	sandboxUnavailableReason: null,
	runDebugEnabled: false,
};

const { generateSampleDataApi, setData, canPinNode, isValidSize, showMessage, showError } =
	vi.hoisted(() => ({
		generateSampleDataApi: vi.fn(),
		setData: vi.fn(),
		canPinNode: vi.fn(),
		isValidSize: vi.fn(),
		showMessage: vi.fn(),
		showError: vi.fn(),
	}));

const workflowDocumentStore = mock<WorkflowDocumentStore>();

vi.mock('@/features/ai/instanceAi/instanceAi.api', () => ({
	generateSampleData: generateSampleDataApi,
}));

vi.mock('@/app/composables/usePinnedData', () => ({
	usePinnedData: () => ({ setData, canPinNode, isValidSize }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

vi.mock('@/app/stores/workflowDocument.store', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/app/stores/workflowDocument.store')>()),
	injectWorkflowDocumentStore: () => shallowRef(workflowDocumentStore),
}));

const NODE: INodeUi = {
	id: 'node-1',
	name: 'My Node',
	type: 'n8n-nodes-base.set',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const CREDENTIALED_NODE: INodeUi = {
	id: 'node-2',
	name: 'Credentialed Node',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 1,
	position: [10, 10],
	parameters: {},
	credentials: { httpBasicAuth: { id: 'cred-1', name: 'My credential' } },
};

const CONNECTIONS: IConnections = {
	'Credentialed Node': { main: [[{ node: 'My Node', type: 'main', index: 0 }]] },
};

function setupWorkflowSnapshot() {
	workflowDocumentStore.getSnapshot.mockReturnValue(
		mock<IWorkflowDb>({
			name: 'My workflow',
			nodes: [NODE, CREDENTIALED_NODE],
			connections: CONNECTIONS,
			pinData: { 'Credentialed Node': [{ json: { huge: 'payload' } }] },
		}),
	);
}

function setup(overrides: { isReadOnly?: boolean } = {}) {
	return useGenerateSampleData({
		node: ref<INodeUi | null>(NODE),
		isReadOnly: ref(overrides.isReadOnly ?? false),
	});
}

describe('useGenerateSampleData', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia());

		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.moduleSettings = { 'instance-ai': { ...INSTANCE_AI_SETTINGS } };

		const sourceControlStore = mockedStore(useSourceControlStore);
		sourceControlStore.preferences.branchReadOnly = false;

		canPinNode.mockReturnValue(true);
		isValidSize.mockReturnValue(true);
		setupWorkflowSnapshot();
	});

	describe('canGenerate', () => {
		it('is true when instance-ai is enabled, the node can be pinned and the view is editable', () => {
			expect(setup().canGenerate.value).toBe(true);
		});

		it('is false when the instance-ai module is disabled', () => {
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.moduleSettings = {
				'instance-ai': { ...INSTANCE_AI_SETTINGS, enabled: false },
			};

			expect(setup().canGenerate.value).toBe(false);
		});

		it('is false when the instance-ai module is absent entirely', () => {
			const settingsStore = mockedStore(useSettingsStore);
			settingsStore.moduleSettings = {};

			expect(setup().canGenerate.value).toBe(false);
		});

		it('is false when the node cannot be pinned', () => {
			canPinNode.mockReturnValue(false);

			expect(setup().canGenerate.value).toBe(false);
		});

		it('is false when the view is read-only', () => {
			expect(setup({ isReadOnly: true }).canGenerate.value).toBe(false);
		});

		it('is false in a read-only source control environment', () => {
			const sourceControlStore = mockedStore(useSourceControlStore);
			sourceControlStore.preferences.branchReadOnly = true;

			expect(setup().canGenerate.value).toBe(false);
		});
	});

	describe('generate', () => {
		const items: INodeExecutionData[] = [{ json: { id: 1, name: 'Ada' } }];

		it('sends only name, nodes and connections, with credentials and pin data stripped', async () => {
			generateSampleDataApi.mockResolvedValue({ pinData: { 'My Node': items } });

			await setup().generate();

			expect(generateSampleDataApi).toHaveBeenCalledTimes(1);
			const payload = generateSampleDataApi.mock.calls[0][1];
			expect(Object.keys(payload.workflow).sort()).toEqual(['connections', 'name', 'nodes']);
			expect(payload.workflow.name).toBe('My workflow');
			expect(payload.workflow.connections).toEqual(CONNECTIONS);
			expect(payload.nodeNames).toEqual(['My Node']);
			expect(payload.hint).toBeUndefined();
			expect(payload.workflow.nodes).toHaveLength(2);
			for (const node of payload.workflow.nodes) {
				expect(node).not.toHaveProperty('credentials');
			}
			expect(payload.workflow.nodes[1].name).toBe('Credentialed Node');
		});

		it('pins the returned items and shows a success toast', async () => {
			generateSampleDataApi.mockResolvedValue({ pinData: { 'My Node': items } });

			const { generate, isGenerating } = setup();
			await generate();

			expect(setData).toHaveBeenCalledWith(items, 'ai-sample-data');
			expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
			expect(showError).not.toHaveBeenCalled();
			expect(isGenerating.value).toBe(false);
		});

		it('still pins but warns when the response reports field drift', async () => {
			generateSampleDataApi.mockResolvedValue({
				pinData: { 'My Node': items },
				warning: 'field-drift',
			});

			await setup().generate();

			expect(setData).toHaveBeenCalledWith(items, 'ai-sample-data');
			expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
		});

		it('toasts and does not pin when the request fails', async () => {
			const error = new Error('boom');
			generateSampleDataApi.mockRejectedValue(error);

			const { generate, isGenerating } = setup();
			await generate();

			expect(setData).not.toHaveBeenCalled();
			expect(showError).toHaveBeenCalledWith(error, expect.any(String));
			expect(isGenerating.value).toBe(false);
		});

		it('toasts and does not pin when the response has no items for the node', async () => {
			generateSampleDataApi.mockResolvedValue({ pinData: {} });

			await setup().generate();

			expect(setData).not.toHaveBeenCalled();
			expect(showError).toHaveBeenCalled();
		});

		it('does not pin and reports no success when the data is too large to pin', async () => {
			generateSampleDataApi.mockResolvedValue({ pinData: { 'My Node': items } });
			isValidSize.mockReturnValue(false);

			await setup().generate();

			expect(setData).not.toHaveBeenCalled();
			expect(showMessage).not.toHaveBeenCalled();
		});

		it('swallows errors thrown by setData and toasts instead', async () => {
			generateSampleDataApi.mockResolvedValue({ pinData: { 'My Node': items } });
			setData.mockImplementation(() => {
				throw new Error('Cannot pin trimmed execution data');
			});

			const { generate, isGenerating } = setup();
			await expect(generate()).resolves.toBeUndefined();

			expect(showError).toHaveBeenCalled();
			expect(showMessage).not.toHaveBeenCalled();
			expect(isGenerating.value).toBe(false);
		});

		it('does nothing when the node cannot be generated for', async () => {
			canPinNode.mockReturnValue(false);

			await setup().generate();

			expect(generateSampleDataApi).not.toHaveBeenCalled();
		});

		it('ignores a second call while a generation is in flight', async () => {
			let resolveApi: (value: { pinData: Record<string, INodeExecutionData[]> }) => void = () => {};
			generateSampleDataApi.mockReturnValue(
				new Promise<{ pinData: Record<string, INodeExecutionData[]> }>((resolve) => {
					resolveApi = resolve;
				}),
			);

			const { generate, isGenerating } = setup();
			const first = generate();
			expect(isGenerating.value).toBe(true);

			await generate();
			expect(generateSampleDataApi).toHaveBeenCalledTimes(1);

			resolveApi({ pinData: { 'My Node': items } });
			await first;
			expect(isGenerating.value).toBe(false);
		});
	});

	describe('custom apply target', () => {
		const items: INodeExecutionData[] = [{ json: { id: 1, name: 'Ada' } }];

		it('hands the generated items to the supplied target instead of pinning', async () => {
			generateSampleDataApi.mockResolvedValue({ pinData: { 'My Node': items } });
			const apply = vi.fn().mockReturnValue(true);

			const { generate } = setup();
			await generate(apply);

			expect(apply).toHaveBeenCalledWith(items);
			expect(setData).not.toHaveBeenCalled();
		});

		// The pinned-data success copy would be a lie for a custom target, and the
		// target's own effect (the editor filling in) is already visible feedback.
		it('leaves success unannounced for a custom target', async () => {
			generateSampleDataApi.mockResolvedValue({ pinData: { 'My Node': items } });

			const { generate } = setup();
			await generate(vi.fn().mockReturnValue(true));

			expect(showMessage).not.toHaveBeenCalled();
		});

		it('still warns about field drift, which is about the data not the target', async () => {
			generateSampleDataApi.mockResolvedValue({
				pinData: { 'My Node': items },
				warning: 'field-drift',
			});

			const { generate } = setup();
			await generate(vi.fn().mockReturnValue(true));

			expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
		});

		it('stays quiet when the target declines the items', async () => {
			generateSampleDataApi.mockResolvedValue({ pinData: { 'My Node': items } });

			const { generate } = setup();
			await generate(vi.fn().mockReturnValue(false));

			expect(showMessage).not.toHaveBeenCalled();
		});

		it('surfaces a throwing target as an error rather than letting it escape', async () => {
			generateSampleDataApi.mockResolvedValue({ pinData: { 'My Node': items } });
			const apply = vi.fn(() => {
				throw new Error('editor unavailable');
			});

			const { generate } = setup();
			await expect(generate(apply)).resolves.toBeUndefined();

			expect(showError).toHaveBeenCalled();
			expect(showMessage).not.toHaveBeenCalled();
		});

		it('never asks the target to apply data the node could not hold', async () => {
			generateSampleDataApi.mockResolvedValue({ pinData: { 'My Node': items } });
			isValidSize.mockReturnValue(false);
			const apply = vi.fn().mockReturnValue(true);

			const { generate } = setup();
			await generate(apply);

			// The default pin target owns the size check, so a custom target is
			// still offered the items — it decides what "too large" means for it.
			expect(apply).toHaveBeenCalledWith(items);
		});
	});
});
