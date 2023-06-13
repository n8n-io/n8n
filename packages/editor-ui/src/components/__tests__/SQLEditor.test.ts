import { render } from '@testing-library/vue';
import { PiniaVuePlugin } from 'pinia';
import { SETTINGS_STORE_DEFAULT_STATE, waitAllPromises } from '@/__tests__/utils';
import { STORES } from '@/constants';
import { createTestingPinia } from '@pinia/testing';
import { merge } from 'lodash-es';

import SqlEditor from '@/components/SqlEditor/SqlEditor.vue';
import { expressionManager } from '@/mixins/expressionManager';
import type { TargetItem } from '@/Interface';

const RESOLVABLES: { [key: string]: string | number | boolean } = {
	'{{ $json.schema }}': 'public',
	'{{ $json.table }}': 'users',
	'{{ $json.id }}': 'id',
	'{{ $json.limit - 10 }}': 0,
	'{{ $json.active }}': false,
};

const DEFAULT_SETUP = {
	pinia: createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
			},
		},
	}),
	props: {
		dialect: 'PostgreSQL',
		isReadOnly: false,
	},
};

const renderComponent = (renderOptions: Parameters<typeof render>[1] = {}) =>
	render(SqlEditor, merge(DEFAULT_SETUP, renderOptions), (vue) => {
		vue.use(PiniaVuePlugin);
	});

describe('SQL Editor Preview Tests', () => {
	beforeEach(() => {
		vi.spyOn(expressionManager.methods, 'resolve').mockImplementation(
			(resolvable: string, _targetItem?: TargetItem) => {
				return { resolved: RESOLVABLES[resolvable.toString()] };
			},
		);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders basic query', async () => {
		const { getByTestId } = renderComponent({
			props: {
				query: 'SELECT * FROM users',
			},
		});
		await waitAllPromises();
		expect(getByTestId('inline-expression-editor-output')).toHaveTextContent('SELECT * FROM users');
	});

	it('renders basic query with expression', async () => {
		const { getByTestId } = renderComponent({
			props: {
				query: 'SELECT * FROM {{ $json.table }}',
			},
		});
		await waitAllPromises();
		expect(getByTestId('inline-expression-editor-output')).toHaveTextContent('SELECT * FROM users');
	});

	it('renders resolved expressions with dot between resolvables', async () => {
		const { getByTestId } = renderComponent({
			props: {
				query: 'SELECT * FROM {{ $json.schema }}.{{ $json.table }}',
			},
		});
		await waitAllPromises();
		expect(getByTestId('inline-expression-editor-output')).toHaveTextContent(
			'SELECT * FROM public.users',
		);
	});

	it('renders resolved expressions which resolve to 0', async () => {
		const { getByTestId } = renderComponent({
			props: {
				query:
					'SELECT * FROM {{ $json.schema }}.{{ $json.table }} WHERE {{ $json.id }} > {{ $json.limit - 10 }}',
			},
		});
		await waitAllPromises();
		expect(getByTestId('inline-expression-editor-output')).toHaveTextContent(
			'SELECT * FROM public.users WHERE id > 0',
		);
	});

	it('keeps query formatting in rendered output', async () => {
		const { getByTestId } = renderComponent({
			props: {
				query:
					'SELECT * FROM {{ $json.schema }}.{{ $json.table }}\n  WHERE id > {{ $json.limit - 10 }}\n  AND active = {{ $json.active }};',
			},
		});
		await waitAllPromises();
		expect(getByTestId('inline-expression-editor-output')).toHaveTextContent(
			'SELECT * FROM public.users WHERE id > 0 AND active = false;',
		);
		// Output should have the same number of lines as the input
		expect(getByTestId('sql-editor-container').getElementsByClassName('cm-line').length).toEqual(
			getByTestId('inline-expression-editor-output').getElementsByClassName('cm-line').length,
		);
	});
});
