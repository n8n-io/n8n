import { computed } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { IWorkflowSettings } from 'n8n-workflow';

import { createComponentRenderer } from '@/__tests__/render';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';

import { fetchCompileResult } from '../compiledEngine.api';
import { useCompiledEngineStore } from '../compiledEngine.store';
import type { CompileResult } from '../compiledEngine.types';
import CompiledEngineNodeBadge from './CompiledEngineNodeBadge.vue';

vi.mock('../compiledEngine.api', () => ({
	fetchCompileResult: vi.fn(),
}));

const WORKFLOW_ID = 'wf-1';
const renderComponent = createComponentRenderer(CompiledEngineNodeBadge);

const result: CompileResult = {
	ok: false,
	diagnostics: [{ node: 'Slack', severity: 'error', code: 'WL100', message: 'Not supported' }],
	nodes: { Trigger: 'native', 'Set fields': 'code', 'HTTP Request': 'host' },
};

async function setUp(nodeName: string, engineType = 'compiled') {
	const pinia = createPinia();
	setActivePinia(pinia);
	vi.spyOn(useSettingsStore(), 'isModuleActive').mockImplementation(
		(name) => name === 'compiled-engine',
	);
	const documentStore = useWorkflowDocumentStore(createWorkflowDocumentId(WORKFLOW_ID));
	documentStore.setSettings({ engineType } as IWorkflowSettings);

	vi.mocked(fetchCompileResult).mockResolvedValue(result);
	await useCompiledEngineStore().fetchResult(WORKFLOW_ID);

	return renderComponent({
		pinia,
		props: { nodeName },
		global: { provide: { [WorkflowDocumentStoreKey as symbol]: computed(() => documentStore) } },
	});
}

describe('CompiledEngineNodeBadge', () => {
	it.each([
		['Trigger', 'native'],
		['Set fields', 'code'],
		['HTTP Request', 'host'],
	])('shows the run mode of %s as %s', async (nodeName, runMode) => {
		const { getByTestId } = await setUp(nodeName);

		const badge = getByTestId('compiled-engine-node-badge');
		expect(badge).toHaveAttribute('data-run-mode', runMode);
		expect(badge.className).not.toMatch(/error/);
	});

	it('marks a node that has an error diagnostic', async () => {
		const { getByTestId } = await setUp('Slack');

		expect(getByTestId('compiled-engine-node-badge').className).toMatch(/error/);
	});

	it('shows nothing for a node that the result does not know', async () => {
		const { queryByTestId } = await setUp('Unknown');

		expect(queryByTestId('compiled-engine-node-badge')).not.toBeInTheDocument();
	});

	it('shows nothing when the workflow is not on the compiled engine', async () => {
		const { queryByTestId } = await setUp('Trigger', 'v1');

		expect(queryByTestId('compiled-engine-node-badge')).not.toBeInTheDocument();
	});
});
