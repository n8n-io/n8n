import Vue from 'vue';
import { PiniaVuePlugin } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { render, screen, cleanup } from '@testing-library/vue';
import RunDataJson from '@/components/RunDataJson.vue';

Vue.use(PiniaVuePlugin);

describe('RunDataJson.vue', () => {
	const DEFAULT_SETUP = {
		pinia: createTestingPinia(),
		props: {
			mappingEnabled: true,
			editMode: { enabled: false },
			inputData: [
				{
					json: {
						list: [1, 2, 3],
						record: { name: 'Joe' },
						myNumber: 123,
						myStringNumber: '456',
						myStringText: 'abc',
						nil: null,
						d: undefined,
					},
				},
			],
			node: {
				parameters: {
					keepOnlySet: false,
					values: {},
					options: {},
				},
				id: '820ea733-d8a6-4379-8e73-88a2347ea003',
				name: 'Set',
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				position: [380, 1060],
				disabled: false,
			},
		},
		mocks: {
			$locale: {
				baseText() {
					return '';
				},
			},
			$store: {
				getters: {},
			},
		},
	};

	beforeEach(cleanup);

	it('renders json values properly', () => {
		const { container } = render(RunDataJson, DEFAULT_SETUP, (vue) => {
			vue.use(PiniaVuePlugin);
		});
		expect(container).toMatchSnapshot();

		expect(screen.getByText('123')).toBeInTheDocument();
		expect(screen.getByText('"456"')).toBeInTheDocument();
		expect(screen.getByText('"abc"')).toBeInTheDocument();
		expect(screen.getByText('null')).toBeInTheDocument();
		expect(screen.queryByText('undefined')).not.toBeInTheDocument();
	});

	it('sets ph-no-capture class correctly', () => {
		render(RunDataJson, DEFAULT_SETUP);

		expect(screen.getByText('"list"')).not.toHaveClass('ph-no-capture');
		expect(screen.getByText('"record"')).not.toHaveClass('ph-no-capture');
		expect(screen.getByText('"myStringNumber"')).not.toHaveClass('ph-no-capture');

		expect(screen.getByText('123')).toHaveClass('ph-no-capture');
		expect(screen.getByText('"456"')).toHaveClass('ph-no-capture');
		expect(screen.getByText('"abc"')).toHaveClass('ph-no-capture');
		expect(screen.getByText('null')).toHaveClass('ph-no-capture');
	});
});
