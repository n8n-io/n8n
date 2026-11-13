import { computed } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { IWorkflowSettings } from 'n8n-workflow';
import type { WorkflowVersionData } from '@n8n/rest-api-client';

import { createComponentRenderer } from '@/__tests__/render';
import { createTestNode } from '@/__tests__/mocks';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import type { INodeUi } from '@/Interface';

import { fetchCompileResult } from '../compiledEngine.api';
import type { CompileResult } from '../compiledEngine.types';
import CompiledEngineStatus from './CompiledEngineStatus.vue';

vi.mock('../compiledEngine.api', () => ({
	fetchCompileResult: vi.fn(),
}));

const fetchMock = vi.mocked(fetchCompileResult);
const WORKFLOW_ID = 'wf-1';

const renderComponent = createComponentRenderer(CompiledEngineStatus);

function setUp(options: { engineType?: string; versionId?: string; moduleActive?: boolean } = {}) {
	const pinia = createPinia();
	setActivePinia(pinia);
	vi.spyOn(useSettingsStore(), 'isModuleActive').mockImplementation(
		(name) => (options.moduleActive ?? true) && name === 'compiled-engine',
	);

	const documentStore = useWorkflowDocumentStore(createWorkflowDocumentId(WORKFLOW_ID));
	documentStore.setSettings({
		engineType: options.engineType ?? 'compiled',
	} as IWorkflowSettings);
	documentStore.setVersionData({
		versionId: options.versionId ?? 'version-1',
	} as WorkflowVersionData);
	documentStore.setNodes([
		createTestNode({ id: 'node-slack', name: 'Slack' }) as INodeUi,
		createTestNode({ id: 'node-set', name: 'Set fields' }) as INodeUi,
	]);

	const result = renderComponent({
		pinia,
		global: { provide: { [WorkflowDocumentStoreKey as symbol]: computed(() => documentStore) } },
	});
	return { ...result, documentStore };
}

const failingResult: CompileResult = {
	ok: false,
	diagnostics: [
		{ node: 'Slack', severity: 'error', code: 'WL100', message: 'Slack is not supported' },
		{ severity: 'warning', code: 'WL200', message: 'Workflow-wide warning' },
	],
	nodes: { 'Set fields': 'code' },
};

describe('CompiledEngineStatus', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('shows nothing and fetches nothing when the workflow is not on the compiled engine', async () => {
		const { queryByTestId } = setUp({ engineType: 'v1' });
		await flushPromises();

		expect(fetchMock).not.toHaveBeenCalled();
		expect(queryByTestId('compiled-engine-status')).not.toBeInTheDocument();
	});

	it('shows nothing when the compiled-engine module is inactive', async () => {
		const { queryByTestId } = setUp({ moduleActive: false });
		await flushPromises();

		expect(fetchMock).not.toHaveBeenCalled();
		expect(queryByTestId('compiled-engine-status')).not.toBeInTheDocument();
	});

	it('does not fetch for a workflow without a saved version', async () => {
		setUp({ versionId: '' });
		await flushPromises();

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('shows that the workflow compiles', async () => {
		fetchMock.mockResolvedValue({ ok: true, diagnostics: [], nodes: { Slack: 'host' } });
		const { getByTestId } = setUp();
		await flushPromises();

		expect(fetchMock).toHaveBeenCalledWith(expect.anything(), WORKFLOW_ID);
		expect(getByTestId('compiled-engine-status')).toHaveTextContent('Compiles');
	});

	it('fetches the result again after each save', async () => {
		fetchMock.mockResolvedValue({ ok: true, diagnostics: [], nodes: {} });
		const { documentStore } = setUp();
		await flushPromises();
		expect(fetchMock).toHaveBeenCalledTimes(1);

		documentStore.setVersionData({ versionId: 'version-2' } as WorkflowVersionData);
		await flushPromises();

		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('shows the number of problems and lists the diagnostics', async () => {
		fetchMock.mockResolvedValue(failingResult);
		const { getByTestId, getAllByTestId } = setUp();
		await flushPromises();

		expect(getByTestId('compiled-engine-status')).toHaveTextContent('1 problem');

		await userEvent.click(getByTestId('compiled-engine-status'));

		expect(getByTestId('compiled-engine-headline')).toHaveTextContent(
			'This workflow does not compile.',
		);
		expect(getByTestId('compiled-engine-node-summary')).toHaveTextContent(
			'0 native · 1 as code · 0 on host',
		);
		const rows = getAllByTestId('compiled-engine-diagnostic');
		expect(rows).toHaveLength(2);
		expect(rows[0]).toHaveTextContent('Slack');
		expect(rows[0]).toHaveTextContent('WL100');
		expect(rows[0]).toHaveTextContent('Slack is not supported');
		expect(rows[1].tagName).toBe('DIV');
	});

	it('selects the node of a diagnostic on click', async () => {
		fetchMock.mockResolvedValue(failingResult);
		const emitSpy = vi.spyOn(canvasEventBus, 'emit');
		const { getByTestId, getAllByTestId } = setUp();
		await flushPromises();

		await userEvent.click(getByTestId('compiled-engine-status'));
		await userEvent.click(getAllByTestId('compiled-engine-diagnostic')[0]);

		expect(emitSpy).toHaveBeenCalledWith('nodes:select', {
			ids: ['node-slack'],
			panIntoView: true,
		});
	});

	it('does not select a node for a diagnostic without a node', async () => {
		fetchMock.mockResolvedValue(failingResult);
		const emitSpy = vi.spyOn(canvasEventBus, 'emit');
		const { getByTestId, getAllByTestId } = setUp();
		await flushPromises();

		await userEvent.click(getByTestId('compiled-engine-status'));
		await userEvent.click(getAllByTestId('compiled-engine-diagnostic')[1]);

		expect(emitSpy).not.toHaveBeenCalledWith('nodes:select', expect.anything());
	});

	it('shows a failed status when the request fails', async () => {
		fetchMock.mockRejectedValue(new Error('Network down'));
		const { getByTestId } = setUp();
		await flushPromises();

		expect(getByTestId('compiled-engine-status')).toHaveTextContent('Compile check failed');
		await userEvent.click(getByTestId('compiled-engine-status'));
		expect(getByTestId('compiled-engine-headline')).toHaveTextContent('Network down');
	});
});
