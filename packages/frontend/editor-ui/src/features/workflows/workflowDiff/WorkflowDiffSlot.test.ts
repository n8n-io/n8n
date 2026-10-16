import type { WorkflowReviewVersionSnapshot } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { defineComponent, isReactive, reactive } from 'vue';

import type { IWorkflowDb } from '@/Interface';

import WorkflowDiffSlot from './WorkflowDiffSlot.vue';

type DiffProps = {
	sourceWorkflow?: IWorkflowDb;
	targetWorkflow?: IWorkflowDb;
	sourceLabel?: string;
	targetLabel?: string;
	showFullscreenButton?: boolean;
};
const { captured } = vi.hoisted(() => ({ captured: [] as DiffProps[] }));
vi.mock('./WorkflowDiffView.vue', () => ({
	default: defineComponent({
		props: [
			'sourceWorkflow',
			'targetWorkflow',
			'sourceLabel',
			'targetLabel',
			'showFullscreenButton',
		],
		setup(props) {
			captured.push(props as DiffProps);
		},
		template:
			'<div><slot name="sourceLabel" /><slot name="targetLabel" /><slot name="sourceEmptyText" /></div>',
	}),
}));
const renderComponent = createComponentRenderer(WorkflowDiffSlot);
function snapshot(): WorkflowReviewVersionSnapshot {
	return {
		versionId: 'version',
		name: null,
		createdAt: '2026-01-01T00:00:00.000Z',
		nodes: [
			{
				id: 'node',
				name: 'Node',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		],
		connections: {},
		nodeGroups: [],
	};
}
beforeEach(() => {
	captured.length = 0;
});

it('maps snapshots to detached non-reactive editor workflows', () => {
	const target = reactive(snapshot());
	renderComponent({
		props: {
			workflowId: 'workflow',
			workflowName: 'Workflow',
			sourceSnapshot: snapshot(),
			targetSnapshot: target,
		},
	});
	const { sourceWorkflow, targetWorkflow } = captured[0];
	expect(targetWorkflow).toMatchObject({
		id: 'workflow',
		name: 'Workflow',
		versionId: 'version',
		activeVersionId: null,
	});
	expect(isReactive(target)).toBe(true);
	expect(isReactive(sourceWorkflow)).toBe(false);
	expect(isReactive(targetWorkflow)).toBe(false);
	expect(isReactive(targetWorkflow?.nodes)).toBe(false);
	expect(targetWorkflow?.nodes).not.toBe(target.nodes);
	if (targetWorkflow) targetWorkflow.nodes[0].name = 'Moved in the diff';
	expect(target.nodes[0].name).toBe('Node');
});

it('preserves labels, first-publish text, and the fullscreen control', () => {
	const { getByText } = renderComponent({
		props: {
			workflowId: 'workflow',
			workflowName: 'Workflow',
			targetSnapshot: snapshot(),
			sourceLabel: 'Published',
			targetLabel: 'In review',
			showFullscreenButton: true,
		},
		slots: {
			sourceLabel: '<span>Previous version</span>',
			targetLabel: '<span>Proposed version</span>',
			sourceEmptyText: '<span>First publication</span>',
		},
	});
	expect(captured[0]).toMatchObject({
		sourceWorkflow: undefined,
		sourceLabel: 'Published',
		targetLabel: 'In review',
		showFullscreenButton: true,
	});
	expect(getByText('Previous version')).toBeInTheDocument();
	expect(getByText('Proposed version')).toBeInTheDocument();
	expect(getByText('First publication')).toBeInTheDocument();
});
