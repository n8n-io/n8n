import { fireEvent } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import type { INodeTypeDescription } from 'n8n-workflow';

import { renderComponent } from '@/__tests__/render';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import InstanceAiMentionPicker from './InstanceAiMentionPicker.vue';
import type { InstanceAiMentionCandidate } from './instanceAiMentions.types';

const workflowCandidate: InstanceAiMentionCandidate = {
	key: 'workflow:workflow-1',
	kind: 'workflow',
	label: 'Support triage',
	workflowId: 'workflow-1',
	source: {
		kind: 'workflow',
		workflowId: 'workflow-1',
		workflowName: 'Support triage',
	},
};

const nodeCandidate: InstanceAiMentionCandidate = {
	key: 'node:workflow-1:node-1',
	kind: 'node',
	label: 'Route request',
	parentLabel: 'Support triage',
	workflowId: 'workflow-1',
	node: {
		id: 'node-1',
		name: 'Route request',
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
	},
	source: {
		kind: 'node',
		workflowId: 'workflow-1',
		workflowName: 'Support triage',
		node: {
			id: 'node-1',
			name: 'Route request',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
		},
	},
};

const groupCandidate: InstanceAiMentionCandidate = {
	key: 'canvas-group:workflow-1:group-1',
	kind: 'canvas-group',
	label: 'Handle failures',
	parentLabel: 'Support triage',
	workflowId: 'workflow-1',
	source: {
		kind: 'canvas-group',
		workflowId: 'workflow-1',
		workflowName: 'Support triage',
		groupId: 'group-1',
		groupName: 'Handle failures',
		nodes: [nodeCandidate.node!],
	},
};

function renderPicker(props: Partial<InstanceType<typeof InstanceAiMentionPicker>['$props']> = {}) {
	return renderComponent(InstanceAiMentionPicker, {
		props: {
			open: true,
			origin: 'typed',
			query: '',
			candidates: [workflowCandidate, groupCandidate, nodeCandidate],
			...props,
		},
		slots: { trigger: '<button>Mentions</button>' },
	});
}

describe('InstanceAiMentionPicker', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		useNodeTypesStore().setNodeTypes([
			mock<INodeTypeDescription>({
				version: 1,
				name: 'n8n-nodes-base.set',
				displayName: 'Edit Fields',
				iconUrl: 'icons/n8n-nodes-base/dist/nodes/Set/set.svg',
			}),
		]);
	});

	it('shows browse sections for workflows and open workflow children', () => {
		const { getByText } = renderPicker();

		expect(getByText('Workflows')).toBeInTheDocument();
		expect(getByText('Canvas groups in Support triage')).toBeInTheDocument();
		expect(getByText('Nodes in Support triage')).toBeInTheDocument();
	});

	it('shows flat search results with type and parent labels', () => {
		const { queryByText, getByText } = renderPicker({
			query: 'route',
			candidates: [nodeCandidate],
		});

		expect(queryByText('Nodes in Support triage')).not.toBeInTheDocument();
		expect(getByText('Route request')).toBeInTheDocument();
		expect(getByText(/Node.*Support triage/)).toBeInTheDocument();
	});

	it('renders real node icons', () => {
		const { getByRole } = renderPicker({ query: 'route', candidates: [nodeCandidate] });

		expect(getByRole('option').querySelector('.n8n-node-icon img')).toBeTruthy();
	});

	it('disables selected targets and announces their state', () => {
		const selected = { ...workflowCandidate, unavailableReason: 'selected' as const };
		const { getByRole } = renderPicker({ candidates: [selected] });
		const option = getByRole('option');

		expect(option).not.toBeDisabled();
		expect(option).toHaveAttribute('aria-disabled', 'true');
		expect(option).toHaveAttribute('aria-selected', 'true');
		expect(option).toHaveAccessibleName(/Already mentioned/);
	});

	it('keeps local candidates visible while remote workflows load', () => {
		const { getByRole } = renderPicker({ loading: true, candidates: [nodeCandidate] });

		expect(getByRole('listbox')).toBeInTheDocument();
		expect(getByRole('option', { name: /Route request/ })).toBeInTheDocument();
		expect(getByRole('status')).toHaveTextContent('Loading workflows…');
	});

	it('loads node types when node candidates arrive after opening', async () => {
		const nodeTypesStore = useNodeTypesStore();
		const loadNodeTypes = vi
			.spyOn(nodeTypesStore, 'loadNodeTypesIfNotLoaded')
			.mockResolvedValue(undefined);
		const { rerender } = renderPicker({ candidates: [workflowCandidate] });
		expect(loadNodeTypes).not.toHaveBeenCalled();

		await rerender({
			open: true,
			origin: 'typed',
			query: '',
			candidates: [workflowCandidate, nodeCandidate],
		});

		expect(loadNodeTypes).toHaveBeenCalledOnce();
	});

	it.each([
		{ props: { loading: true }, text: 'Loading workflows…' },
		{ props: { availability: 'empty' as const }, text: 'No workflows to mention' },
		{ props: { candidates: [] }, text: 'No matching workflows, nodes, or canvas groups' },
		{ props: { limitReason: 'mentions' as const }, text: 'You can mention up to 10 items' },
	])('shows the $text state', ({ props, text }) => {
		const { getByText } = renderPicker(props);
		expect(getByText(new RegExp(text))).toBeInTheDocument();
	});

	it('shows a retry action after workflow search fails', async () => {
		const { getByRole, emitted } = renderPicker({ error: true });

		await fireEvent.click(getByRole('button', { name: 'Try again' }));

		expect(emitted().retry).toBeTruthy();
	});

	it('uses listbox semantics and selects a pointer target', async () => {
		const { getByRole, emitted } = renderPicker({ candidates: [workflowCandidate] });
		const option = getByRole('option', { name: /Support triage, Workflow/ });

		expect(getByRole('listbox')).toBeInTheDocument();
		await fireEvent.click(option);
		expect(emitted().select).toEqual([[workflowCandidate, 0]]);
	});

	it('forwards button-mode search and keyboard input', async () => {
		const { getByRole, emitted } = renderPicker({ origin: 'button' });
		const search = getByRole('combobox');

		await fireEvent.update(search, 'support');
		await fireEvent.keyDown(search, { key: 'ArrowDown' });

		expect(emitted()['update:query']).toEqual([['support']]);
		expect(emitted().keydown).toBeTruthy();
	});
});
