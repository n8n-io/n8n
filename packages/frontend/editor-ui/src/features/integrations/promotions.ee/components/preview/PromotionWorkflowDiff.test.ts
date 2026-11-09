import type {
	PromotionDirection,
	PromotionResourceDetail,
	SerializedWorkflow,
} from '@n8n/api-types';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { defineComponent } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import type { IWorkflowDb } from '@/Interface';

import { billingPreview, resource } from '../../__tests__/preview.fixtures';
import { buildSelectionGraph } from '../../promotionPreview.selection';
import PromotionWorkflowDiff from './PromotionWorkflowDiff.vue';

type DiffProps = { sourceWorkflow?: IWorkflowDb; targetWorkflow?: IWorkflowDb };
const { captured } = vi.hoisted(() => ({
	captured: { props: undefined as DiffProps | undefined },
}));
// The component loads the diff view lazily, so the mock must look like an ES module.
vi.mock('@/features/workflows/workflowDiff/WorkflowDiffView.vue', () => ({
	__esModule: true,
	default: defineComponent({
		props: ['sourceWorkflow', 'targetWorkflow'],
		setup(props) {
			captured.props = props as DiffProps;
		},
		template: `<div>
			<div data-test-id="source"><slot name="sourceLabel" /><slot v-if="!sourceWorkflow" name="sourceEmptyText" /></div>
			<div data-test-id="target"><slot name="targetLabel" /><slot v-if="!targetWorkflow" name="targetEmptyText" /></div>
		</div>`,
	}),
}));

const renderComponent = createComponentRenderer(PromotionWorkflowDiff);

const workflow = (overrides: Partial<SerializedWorkflow> = {}): SerializedWorkflow => ({
	id: 'w1',
	name: 'Invoice reconciliation',
	nodes: [],
	connections: {},
	settings: { executionOrder: 'v1' },
	parentFolderId: 'f1',
	isArchived: false,
	tagIds: [],
	...overrides,
});

const detail = (
	before: SerializedWorkflow | null,
	after: SerializedWorkflow | null,
): Extract<PromotionResourceDetail, { type: 'workflow' }> => ({
	key: 'workflow:w1',
	type: 'workflow',
	before,
	after,
	revision: { before: before && 'blob-before', after: after && 'blob-after' },
});

async function render(
	props: {
		detail: Extract<PromotionResourceDetail, { type: 'workflow' }>;
		direction: PromotionDirection;
	},
	preview = billingPreview(),
) {
	captured.props = undefined;
	const pinia = createTestingPinia({
		initialState: { [STORES.TAGS]: { tagsById: { g7: { id: 'g7', name: 'archive' } } } },
	});
	const result = renderComponent({
		pinia,
		props: {
			...props,
			resourceKey: 'workflow:w1',
			graph: buildSelectionGraph(preview, props.direction),
		},
	});
	await waitFor(() => expect(captured.props).toBeDefined());
	return result;
}

describe('PromotionWorkflowDiff', () => {
	it.each([
		{
			scenario: 'Promote of a changed workflow',
			direction: 'promote' as const,
			before: workflow({ name: 'Reconcile invoices' }),
			after: workflow(),
			source: ['Before'],
			target: ['After'],
		},
		{
			scenario: 'Promote of a workflow that is new on this instance',
			direction: 'promote' as const,
			before: null,
			after: workflow(),
			source: ['Before', 'Not on the branch'],
			target: ['After'],
		},
		{
			scenario: 'Apply of a workflow that is new on the branch',
			direction: 'apply' as const,
			before: null,
			after: workflow(),
			source: ['Before', 'Not on this instance'],
			target: ['After'],
		},
		{
			scenario: 'Apply of a workflow that the branch deleted',
			direction: 'apply' as const,
			before: workflow(),
			after: null,
			source: ['Before'],
			target: ['After', 'Not on the branch'],
		},
	])(
		'should show the sides of a $scenario',
		async ({ direction, before, after, source, target }) => {
			const { getByTestId } = await render({ detail: detail(before, after), direction });

			expect(captured.props?.sourceWorkflow?.name).toBe(before?.name);
			expect(captured.props?.targetWorkflow?.name).toBe(after?.name);
			for (const text of source) expect(getByTestId('source')).toHaveTextContent(text);
			for (const text of target) expect(getByTestId('target')).toHaveTextContent(text);
		},
	);

	it('should name the tags of each side as that side calls them', async () => {
		// The branch renames "finance" to "accounting". "archive" is an unchanged tag.
		const preview = billingPreview({
			resources: [
				...billingPreview().resources.filter(({ key }) => key !== 'tag:g1'),
				resource({
					key: 'tag:g1',
					name: 'accounting',
					previousName: 'finance',
					change: 'modified',
				}),
			],
		});

		await render(
			{
				detail: detail(workflow({ tagIds: ['g1', 'g7'] }), workflow({ tagIds: ['g7', 'g1'] })),
				direction: 'apply',
			},
			preview,
		);

		const names = (workflow: IWorkflowDb | undefined) =>
			workflow?.tags?.map((tag) => (typeof tag === 'string' ? tag : tag.name));
		expect(names(captured.props?.sourceWorkflow)).toEqual(['archive', 'finance']);
		expect(names(captured.props?.targetWorkflow)).toEqual(['accounting', 'archive']);
	});
});
