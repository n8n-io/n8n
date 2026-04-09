import { describe, it, expect } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiPreviewTabBar from '../components/InstanceAiPreviewTabBar.vue';
import type { ArtifactTab } from '../useCanvasPreview';

const renderComponent = createComponentRenderer(InstanceAiPreviewTabBar);

const workflowTab: ArtifactTab = {
	id: 'wf-1',
	type: 'workflow',
	name: 'My Workflow',
	icon: 'workflow',
};

const dataTableTab: ArtifactTab = {
	id: 'dt-1',
	type: 'data-table',
	name: 'My Table',
	icon: 'table',
	projectId: 'proj-1',
};

describe('InstanceAiPreviewTabBar', () => {
	it('renders tab labels from props', () => {
		const { getByText } = renderComponent({
			props: { tabs: [workflowTab, dataTableTab], activeTabId: 'wf-1' },
		});

		expect(getByText('My Workflow')).toBeInTheDocument();
		expect(getByText('My Table')).toBeInTheDocument();
	});

	it('renders external link for active workflow tab', () => {
		const { container } = renderComponent({
			props: { tabs: [workflowTab], activeTabId: 'wf-1' },
		});

		const link = container.querySelector('a[href="/workflow/wf-1"]');
		expect(link).toBeInTheDocument();
		expect(link?.getAttribute('target')).toBe('_blank');
	});

	it('renders external link for active data table tab', () => {
		const { container } = renderComponent({
			props: { tabs: [dataTableTab], activeTabId: 'dt-1' },
		});

		const link = container.querySelector('a[href="/projects/proj-1/datatables/dt-1"]');
		expect(link).toBeInTheDocument();
	});

	it('renders fallback link for data table without projectId', () => {
		const tabWithoutProject: ArtifactTab = { ...dataTableTab, projectId: undefined };
		const { container } = renderComponent({
			props: { tabs: [tabWithoutProject], activeTabId: 'dt-1' },
		});

		const link = container.querySelector('a[href="/home/datatables"]');
		expect(link).toBeInTheDocument();
	});

	it('emits update:activeTabId when a tab is clicked', async () => {
		const { getByText, emitted } = renderComponent({
			props: { tabs: [workflowTab, dataTableTab], activeTabId: 'wf-1' },
		});

		getByText('My Table').click();

		expect(emitted()['update:activeTabId']).toBeTruthy();
		expect(emitted()['update:activeTabId'][0]).toEqual(['dt-1']);
	});

	it('emits close when close button is clicked', async () => {
		const { container, emitted } = renderComponent({
			props: { tabs: [workflowTab], activeTabId: 'wf-1' },
		});

		// The close button is the last button in the actions area (icon="x")
		const buttons = container.querySelectorAll('button');
		const closeButton = buttons[buttons.length - 1];
		closeButton.click();

		expect(emitted().close).toBeTruthy();
	});

	it('hides external link when no tab is active', () => {
		const { container } = renderComponent({
			props: { tabs: [workflowTab], activeTabId: null },
		});

		const links = container.querySelectorAll('a[target="_blank"]');
		expect(links).toHaveLength(0);
	});
});
