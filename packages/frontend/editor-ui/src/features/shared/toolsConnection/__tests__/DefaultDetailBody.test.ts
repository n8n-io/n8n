import { describe, it, expect } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';

import DefaultDetailBody from '../DefaultDetailBody.vue';
import type {
	AgentConnectionItem,
	DataStoreConnectionItem,
	ToolConnectionItem,
	WorkflowConnectionItem,
} from '../types';

const renderBody = createComponentRenderer(DefaultDetailBody);

function render(item: ToolConnectionItem) {
	return renderBody({ props: { item }, pinia: createTestingPinia() });
}

const workflowItem: WorkflowConnectionItem = {
	id: 'wf-1',
	kind: 'workflow',
	title: 'Summariser',
	isConnected: false,
	workflowId: 'wf-1',
};

const agentItem: AgentConnectionItem = {
	id: 'ag-1',
	kind: 'agent',
	title: 'Code Reviewer',
	isConnected: false,
	agentId: 'ag-1',
};

const dataStoreItem: DataStoreConnectionItem = {
	id: 'ds-1',
	kind: 'data-store',
	title: 'Customers',
	isConnected: false,
	dataStoreId: 'ds-1',
};

describe('DefaultDetailBody', () => {
	it('renders longDescription when present', () => {
		const { queryByText } = render({
			...workflowItem,
			longDescription: 'Summarises long-form content into bullet points.',
		});
		expect(queryByText('Summarises long-form content into bullet points.')).toBeTruthy();
	});

	it('renders the placeholder when longDescription is absent', () => {
		const { getByTestId } = render(workflowItem);
		expect(getByTestId('tools-connection-detail-placeholder')).toBeTruthy();
	});

	it.each([
		['workflow', workflowItem],
		['agent', agentItem],
		['data-store', dataStoreItem],
	])('works for %s items', (_kind, item) => {
		const { queryByText } = render({ ...item, longDescription: 'Hello world' });
		expect(queryByText('Hello world')).toBeTruthy();
	});
});
