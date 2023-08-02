import { SETTINGS_STORE_DEFAULT_STATE, waitAllPromises } from '@/__tests__/utils';
import { STORES } from '@/constants';
import { createTestingPinia } from '@pinia/testing';

import SqlEditor from '@/components/SqlEditor/SqlEditor.vue';
import { expressionManager } from '@/mixins/expressionManager';
import type { TargetItem } from '@/Interface';
import { renderComponent } from '@/__tests__/render';

const EXPRESSION_OUTPUT_TEST_ID = 'inline-expression-editor-output';

const RESOLVABLES: { [key: string]: string | number | boolean } = {
	'{{ $json.schema }}': 'public',
	'{{ $json.table }}': 'users',
	'{{ $json.id }}': 'id',
	'{{ $json.limit - 10 }}': 0,
	'{{ $json.active }}': false,
};

const DEFAULT_SETUP = {
	props: {
		dialect: 'PostgreSQL',
		isReadOnly: false,
	},
	global: {
		plugins: [
			createTestingPinia({
				initialState: {
					[STORES.SETTINGS]: {
						settings: SETTINGS_STORE_DEFAULT_STATE.settings,
					},
				},
			}),
		],
	},
};

describe('SQL Editor Preview Tests', () => {
	beforeEach(() => {
		vi.spyOn(expressionManager.methods, 'resolve').mockImplementation(
			(resolvable: string, _targetItem?: TargetItem) => {
				return { resolved: RESOLVABLES[resolvable] };
			},
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders basic query', async () => {
		const { getByTestId } = renderComponent(SqlEditor, {
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				modelValue: 'SELECT * FROM users',
			},
		});
		await waitAllPromises();
		expect(getByTestId(EXPRESSION_OUTPUT_TEST_ID)).toHaveTextContent('SELECT * FROM users');
	});

	it('renders basic query with expression', async () => {
		const { getByTestId } = renderComponent(SqlEditor, {
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				modelValue: 'SELECT * FROM {{ $json.table }}',
			},
		});
		await waitAllPromises();
		expect(getByTestId(EXPRESSION_OUTPUT_TEST_ID)).toHaveTextContent('SELECT * FROM users');
	});

	it('renders resolved expressions with dot between resolvables', async () => {
		const { getByTestId } = renderComponent(SqlEditor, {
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				modelValue: 'SELECT * FROM {{ $json.schema }}.{{ $json.table }}',
			},
		});
		await waitAllPromises();
		expect(getByTestId(EXPRESSION_OUTPUT_TEST_ID)).toHaveTextContent('SELECT * FROM public.users');
	});

	it('renders resolved expressions which resolve to 0', async () => {
		const { getByTestId } = renderComponent(SqlEditor, {
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				modelValue:
					'SELECT * FROM {{ $json.schema }}.{{ $json.table }} WHERE {{ $json.id }} > {{ $json.limit - 10 }}',
			},
		});
		await waitAllPromises();
		expect(getByTestId(EXPRESSION_OUTPUT_TEST_ID)).toHaveTextContent(
			'SELECT * FROM public.users WHERE id > 0',
		);
	});

	it('keeps query formatting in rendered output', async () => {
		const { getByTestId } = renderComponent(SqlEditor, {
			...DEFAULT_SETUP,
			props: {
				...DEFAULT_SETUP.props,
				modelValue:
					'SELECT * FROM {{ $json.schema }}.{{ $json.table }}\n  WHERE id > {{ $json.limit - 10 }}\n  AND active = {{ $json.active }};',
			},
		});
		await waitAllPromises();
		expect(getByTestId(EXPRESSION_OUTPUT_TEST_ID)).toHaveTextContent(
			'SELECT * FROM public.users WHERE id > 0 AND active = false;',
		);
		// Output should have the same number of lines as the input
		expect(getByTestId('sql-editor-container').getElementsByClassName('cm-line').length).toEqual(
			getByTestId(EXPRESSION_OUTPUT_TEST_ID).getElementsByClassName('cm-line').length,
		);
	});
});
