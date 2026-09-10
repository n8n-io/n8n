import type {
	WorkflowReviewRequestDecision,
	WorkflowReviewRequestState,
	WorkflowReviewRequestWorkflowDetail,
	WorkflowReviewVersionSnapshot,
} from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import type { INode } from 'n8n-workflow';
import { isReactive, reactive } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { IWorkflowDb } from '@/Interface';

import WorkflowReviewChangesSection from './WorkflowReviewChangesSection.vue';

type DiffViewProps = {
	sourceWorkflow?: IWorkflowDb;
	targetWorkflow?: IWorkflowDb;
	sourceLabel?: string;
	targetLabel?: string;
};

const { diffViewProps } = vi.hoisted(() => ({
	diffViewProps: [] as DiffViewProps[],
}));

vi.mock('@/features/workflows/workflowDiff/WorkflowDiffView.vue', () => ({
	default: {
		name: 'WorkflowDiffView',
		props: ['sourceWorkflow', 'targetWorkflow', 'sourceLabel', 'targetLabel'],
		setup(props: DiffViewProps) {
			diffViewProps.push(props);
		},
		template:
			'<div data-test-id="workflow-diff-view-stub"><slot name="sourceLabel" /><slot name="targetLabel" /></div>',
	},
}));

const renderSection = createComponentRenderer(WorkflowReviewChangesSection);

/** Defaults to an open review; closed cases pass `state` and `decision` themselves. */
const renderComponent = (options: {
	props: {
		workflow: WorkflowReviewRequestWorkflowDetail;
		state?: WorkflowReviewRequestState;
		decision?: WorkflowReviewRequestDecision;
	};
}) => renderSection({ props: { state: 'open', decision: 'pending', ...options.props } });

function makeNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'node-1',
		name: 'Node 1',
		type: 'n8n-nodes-base.noOp',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	};
}

function makeSnapshot(
	overrides: Partial<WorkflowReviewVersionSnapshot> = {},
): WorkflowReviewVersionSnapshot {
	return {
		versionId: '77b70644-0000-0000-0000-000000000000',
		name: null,
		nodes: [makeNode()],
		connections: {},
		nodeGroups: [],
		createdAt: '2024-01-01T00:00:00.000Z',
		...overrides,
	};
}

function makeWorkflow(
	overrides: Partial<WorkflowReviewRequestWorkflowDetail> = {},
): WorkflowReviewRequestWorkflowDetail {
	return {
		workflowId: 'wf-1',
		workflowName: 'Payment handler',
		workflowVersionId: '77b70644-0000-0000-0000-000000000000',
		pinnedVersion: makeSnapshot(),
		publishedVersionId: null,
		baselineVersion: makeSnapshot({
			versionId: '0f123890-0000-0000-0000-000000000000',
			nodes: [makeNode({ id: 'node-removed', name: 'Removed node' }), makeNode()],
		}),
		...overrides,
	};
}

describe('WorkflowReviewChangesSection', () => {
	beforeEach(() => {
		createTestingPinia();
		diffViewProps.length = 0;
	});

	it('labels both diff sides with a version status', () => {
		const { getByTestId } = renderComponent({ props: { workflow: makeWorkflow() } });

		expect(getByTestId('workflow-review-changes-source-label')).toHaveTextContent('0f123890');
		expect(getByTestId('workflow-review-changes-target-label')).toHaveTextContent('77b70644');
	});

	it('labels a named version by its name instead of its id', () => {
		const { getByTestId } = renderComponent({
			props: {
				workflow: makeWorkflow({
					pinnedVersion: makeSnapshot({ name: 'Version hotpink' }),
					baselineVersion: makeSnapshot({
						versionId: '0f123890-0000-0000-0000-000000000000',
						name: 'Version teal',
						nodes: [makeNode({ id: 'node-removed', name: 'Removed node' }), makeNode()],
					}),
				}),
			},
		});

		expect(getByTestId('workflow-review-changes-source-label')).toHaveTextContent(
			'Published: Version teal',
		);
		expect(getByTestId('workflow-review-changes-target-label')).toHaveTextContent(
			'In review: Version hotpink',
		);
	});

	// The publish endpoints accept an empty name, so a stored '' must still label.
	it.each([
		['null', null],
		['empty', ''],
	])('falls back to the id-derived label when the name is %s', (_case, name) => {
		const { getByTestId } = renderComponent({
			props: { workflow: makeWorkflow({ pinnedVersion: makeSnapshot({ name }) }) },
		});

		expect(getByTestId('workflow-review-changes-target-label')).toHaveTextContent(
			'In review: Version 77b70644',
		);
	});

	it('shows a no-changes state when versions differ only by name', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				workflow: makeWorkflow({
					pinnedVersion: makeSnapshot({ name: 'Version hotpink' }),
					baselineVersion: makeSnapshot({
						versionId: '0f123890-0000-0000-0000-000000000000',
						name: 'Version teal',
					}),
				}),
			},
		});

		expect(getByTestId('workflow-review-changes-no-changes')).toBeInTheDocument();
		expect(queryByTestId('workflow-diff-view-stub')).not.toBeInTheDocument();
	});

	it('shows an unavailable state when the pinned version was pruned', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				workflow: makeWorkflow({
					workflowVersionId: null,
					pinnedVersion: null,
				}),
			},
		});

		expect(getByTestId('workflow-review-changes-version-unavailable')).toBeInTheDocument();
		expect(queryByTestId('workflow-diff-view-stub')).not.toBeInTheDocument();
	});

	it('shows a no-changes state when pinned and baseline are the same version', () => {
		const snapshot = makeSnapshot();
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				workflow: makeWorkflow({ pinnedVersion: snapshot, baselineVersion: snapshot }),
			},
		});

		expect(getByTestId('workflow-review-changes-no-changes')).toBeInTheDocument();
		expect(queryByTestId('workflow-diff-view-stub')).not.toBeInTheDocument();
	});

	it('shows a no-changes state when versions differ only by id', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				workflow: makeWorkflow({
					pinnedVersion: makeSnapshot(),
					baselineVersion: makeSnapshot({ versionId: 'other-version-id' }),
				}),
			},
		});

		expect(getByTestId('workflow-review-changes-no-changes')).toBeInTheDocument();
		expect(queryByTestId('workflow-diff-view-stub')).not.toBeInTheDocument();
	});

	// First publish: no baseline, so the diff gets no source workflow — and that
	// side carries no publish-status label either, since nothing was published.
	it('renders a sourceless diff with no source label for a first publish', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				workflow: makeWorkflow({ baselineVersion: null }),
			},
		});

		expect(getByTestId('workflow-diff-view-stub')).toBeInTheDocument();
		expect(diffViewProps).toHaveLength(1);
		expect(diffViewProps[0].sourceWorkflow).toBeUndefined();
		expect(diffViewProps[0].targetWorkflow?.id).toBe('wf-1');
		expect(queryByTestId('workflow-review-changes-source-label')).not.toBeInTheDocument();
		expect(getByTestId('workflow-review-changes-target-label')).toBeInTheDocument();
	});

	it('hands the diff detached workflows built from the snapshots', () => {
		const workflow = makeWorkflow();
		renderComponent({ props: { workflow } });

		expect(diffViewProps).toHaveLength(1);
		const { sourceWorkflow, targetWorkflow, sourceLabel, targetLabel } = diffViewProps[0];

		expect(sourceWorkflow?.id).toBe('wf-1');
		expect(sourceWorkflow?.name).toBe('Payment handler');
		expect(sourceWorkflow?.versionId).toBe('0f123890-0000-0000-0000-000000000000');
		expect(sourceWorkflow?.nodes.map((node) => node.id)).toEqual(['node-removed', 'node-1']);

		expect(targetWorkflow?.versionId).toBe('77b70644-0000-0000-0000-000000000000');
		expect(targetWorkflow?.nodes.map((node) => node.id)).toEqual(['node-1']);

		// Detached copies: not sharing references with the DTO, so the diff
		// canvases can't feed writes back into store state.
		expect(targetWorkflow?.nodes).not.toBe(workflow.pinnedVersion?.nodes);

		expect(sourceLabel).toContain('Published');
		expect(sourceLabel).toContain('0f123890');
		expect(targetLabel).toContain('In review');
		expect(targetLabel).toContain('77b70644');
	});

	// Feed a genuinely reactive prop, The guard matters — a reactive source lets
	// WorkflowDiffView's position writes drive a hydrate → dispose → hydrate loop
	// that pins the main thread.
	it('detaches the handed-off workflows from a reactive source', () => {
		const workflow = reactive(makeWorkflow());
		renderComponent({ props: { workflow } });

		expect(diffViewProps).toHaveLength(1);
		const { sourceWorkflow, targetWorkflow } = diffViewProps[0];

		expect(isReactive(workflow.pinnedVersion)).toBe(true);
		expect(isReactive(sourceWorkflow)).toBe(false);
		expect(isReactive(targetWorkflow)).toBe(false);
		expect(isReactive(targetWorkflow?.nodes)).toBe(false);
		expect(isReactive(targetWorkflow?.nodes[0])).toBe(false);
	});

	describe('closed reviews', () => {
		const approved = { state: 'closed', decision: 'approved' } as const;

		it('labels the frozen baseline and the approved version', () => {
			const { getByTestId } = renderComponent({
				props: {
					...approved,
					workflow: makeWorkflow({
						pinnedVersion: makeSnapshot({ name: 'Version hotpink' }),
						baselineVersion: makeSnapshot({
							versionId: '0f123890-0000-0000-0000-000000000000',
							name: 'Version teal',
							nodes: [makeNode({ id: 'node-removed', name: 'Removed node' }), makeNode()],
						}),
					}),
				},
			});

			expect(getByTestId('workflow-review-changes-source-label')).toHaveTextContent(
				'Previously published: Version teal',
			);
			expect(getByTestId('workflow-review-changes-target-label')).toHaveTextContent(
				'Approved: Version hotpink',
			);
		});

		// Nothing was published when this was approved, so the baseline is empty by
		// right — not missing. The diff still renders, sourceless.
		it('renders a sourceless diff when nothing was published at approval', () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: { ...approved, workflow: makeWorkflow({ baselineVersion: null }) },
			});

			expect(getByTestId('workflow-diff-view-stub')).toBeInTheDocument();
			expect(diffViewProps[0].sourceWorkflow).toBeUndefined();
			expect(
				queryByTestId('workflow-review-changes-closed-without-approval'),
			).not.toBeInTheDocument();
		});

		it('phrases the no-changes state in the past tense', () => {
			const snapshot = makeSnapshot();
			const { getByTestId } = renderComponent({
				props: {
					...approved,
					workflow: makeWorkflow({ pinnedVersion: snapshot, baselineVersion: snapshot }),
				},
			});

			expect(getByTestId('workflow-review-changes-no-changes')).toHaveTextContent(
				'No changes compared to the previously published version.',
			);
		});

		// Auto-closed by archiving, transferring or deleting the workflow: approval
		// is the only thing that freezes a baseline, so there is nothing to diff.
		it.each(['pending', 'changes_requested'] as const)(
			'explains that a review closed with decision %s has no changes to compare',
			(decision) => {
				const { getByTestId, queryByTestId } = renderComponent({
					props: { state: 'closed', decision, workflow: makeWorkflow() },
				});

				expect(getByTestId('workflow-review-changes-closed-without-approval')).toBeInTheDocument();
				expect(queryByTestId('workflow-diff-view-stub')).not.toBeInTheDocument();
			},
		);
	});

	it('renders the diff when versions differ only by an execution flag', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				workflow: makeWorkflow({
					pinnedVersion: makeSnapshot({ nodes: [makeNode({ disabled: true })] }),
					baselineVersion: makeSnapshot({
						versionId: '0f123890-0000-0000-0000-000000000000',
						nodes: [makeNode()],
					}),
				}),
			},
		});

		expect(getByTestId('workflow-diff-view-stub')).toBeInTheDocument();
		expect(queryByTestId('workflow-review-changes-no-changes')).not.toBeInTheDocument();
	});
});
