import * as workflowHelpers from '@/composables/useWorkflowHelpers';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';

import SqlEditor from '@/components/SqlEditor/SqlEditor.vue';
import { renderComponent } from '@/__tests__/render';
import { waitFor } from '@testing-library/vue';
import { userEvent } from '@testing-library/user-event';
import { setActivePinia } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { INodeUi } from '@/Interface';

const EXPRESSION_OUTPUT_TEST_ID = 'inline-expression-editor-output';

const DEFAULT_SETUP = {
	props: {
		dialect: 'PostgreSQL',
		isReadOnly: false,
	},
};

async function focusEditor(container: Element) {
	await waitFor(() => expect(container.querySelector('.cm-line')).toBeInTheDocument());
	await userEvent.click(container.querySelector('.cm-line') as Element);
}

const nodes = [
	{
		id: '1',
		typeVersion: 1,
		name: 'Test Node',
		position: [0, 0],
		type: 'test',
		parameters: {},
	},
] as INodeUi[];

const mockResolveExpression = () => {
	const mock = vi.fn();
	vi.spyOn(workflowHelpers, 'useWorkflowHelpers').mockReturnValueOnce({
		...workflowHelpers.useWorkflowHelpers(),
		resolveExpression: mock,
	});

	return mock;
};

describe('SqlEditor.vue', () => {
	beforeEach(() => {
		const pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: SETTINGS_STORE_DEFAULT_STATE.settings,
				},
				[STORES.NDV]: {
					activeNodeName: 'Test Node',
					hasInputData: true,
					isInputPanelEmpty: false,
					isOutputPanelEmpty: false,
					ndvInputDataWithPinnedData: [],
					getHoveringItem: undefined,
					expressionOutputItemIndex: 0,
					isTableHoverOnboarded: false,
					setHighlightDraggables: vi.fn(),
				},
				[STORES.WORKFLOWS]: {
					workflow: {
						nodes,
						connections: {},
					},
				},
			},
		});
		setActivePinia(pinia);

		const workflowsStore = useWorkflowsStore();
		vi.mocked(workflowsStore).getNodeByName.mockReturnValue(nodes[0]);
	});

	afterAll(() => {
		vi.clearAllMocks();
	});

	it('renders basic query', async () => {
		const { getByTestId, container } = renderComponent(SqlEditor, {
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				modelValue: 'SELECT * FROM users',
			},
		});

		await focusEditor(container);
		await waitFor(() =>
			expect(getByTestId(EXPRESSION_OUTPUT_TEST_ID)).toHaveTextContent('SELECT * FROM users'),
		);
	});

	it('renders basic query with expression', async () => {
		mockResolveExpression().mockReturnValueOnce('users');
		const { getByTestId, container } = renderComponent(SqlEditor, {
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				modelValue: 'SELECT * FROM {{ $json.table }}',
			},
		});

		await focusEditor(container);
		await waitFor(() =>
			expect(getByTestId(EXPRESSION_OUTPUT_TEST_ID)).toHaveTextContent('SELECT * FROM users'),
		);
	});

	it('renders resolved expressions with dot between resolvables', async () => {
		mockResolveExpression().mockReturnValueOnce('public.users');
		const { getByTestId, container } = renderComponent(SqlEditor, {
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				modelValue: 'SELECT * FROM {{ $json.schema }}.{{ $json.table }}',
			},
		});

		await focusEditor(container);
		await waitFor(() =>
			expect(getByTestId(EXPRESSION_OUTPUT_TEST_ID)).toHaveTextContent(
				'SELECT * FROM public.users',
			),
		);
	});

	it('renders resolved expressions which resolve to 0', async () => {
		mockResolveExpression()
			.mockReturnValueOnce('public')
			.mockReturnValueOnce('users')
			.mockReturnValueOnce('id')
			.mockReturnValueOnce(0);
		const { getByTestId, container } = renderComponent(SqlEditor, {
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				modelValue:
					'SELECT * FROM {{ $json.schema }}.{{ $json.table }} WHERE {{ $json.id }} > {{ $json.limit - 10 }}',
			},
		});

		await focusEditor(container);
		await waitFor(() =>
			expect(getByTestId(EXPRESSION_OUTPUT_TEST_ID)).toHaveTextContent(
				'SELECT * FROM public.users WHERE id > 0',
			),
		);
	});

	it('keeps query formatting in rendered output', async () => {
		mockResolveExpression()
			.mockReturnValueOnce('public')
			.mockReturnValueOnce('users')
			.mockReturnValueOnce(0)
			.mockReturnValueOnce(false);
		const { getByTestId, container } = renderComponent(SqlEditor, {
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				modelValue:
					'SELECT * FROM {{ $json.schema }}.{{ $json.table }}\n  WHERE id > {{ $json.limit - 10 }}\n  AND active = {{ $json.active }};',
			},
		});

		await focusEditor(container);
		await waitFor(() =>
			expect(getByTestId(EXPRESSION_OUTPUT_TEST_ID)).toHaveTextContent(
				'SELECT * FROM public.users WHERE id > 0 AND active = false;',
			),
		);
		// Output should have the same number of lines as the input
		expect(getByTestId('sql-editor-container').getElementsByClassName('cm-line').length).toEqual(
			getByTestId(EXPRESSION_OUTPUT_TEST_ID).getElementsByClassName('cm-line').length,
		);
	});

	it('should keep rendered output visible when clicking', async () => {
		const { getByTestId, queryByTestId, container, baseElement } = renderComponent(SqlEditor, {
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				modelValue: 'SELECT * FROM users',
			},
		});

		// Does not hide output when clicking inside the output
		await focusEditor(container);
		await userEvent.click(getByTestId(EXPRESSION_OUTPUT_TEST_ID));

		await waitFor(() =>
			expect(
				queryByTestId(EXPRESSION_OUTPUT_TEST_ID)?.closest('[aria-hidden=false]'),
			).toBeInTheDocument(),
		);

		// Does hide output when clicking outside the container
		await userEvent.click(baseElement);

		// NOTE: in testing, popover persists regardless of persist option.
		// See https://github.com/element-plus/element-plus/blob/2.4.3/packages/components/tooltip/src/content.vue#L83-L90
		await waitFor(() =>
			expect(
				queryByTestId(EXPRESSION_OUTPUT_TEST_ID)?.closest('[aria-hidden=true]'),
			).toBeInTheDocument(),
		);
	});
});
