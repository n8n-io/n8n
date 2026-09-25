import { useI18n } from '@n8n/i18n';
import { createTestingPinia } from '@pinia/testing';
import { defineStore } from 'pinia';
import { defineComponent, inject, type Plugin } from 'vue';

import { createComponentRenderer, defineRenderer } from '../render';
import { mockedStore } from '../store';

const useCounterStore = defineStore('counter', {
	state: () => ({ count: 0 }),
	actions: {
		label(): string {
			return `count: ${this.count}`;
		},
	},
});

const Probe = defineComponent({
	setup() {
		const i18n = useI18n();
		const store = useCounterStore();
		return { i18n, store };
	},
	// `v-n8n-truncate` resolves only when `N8nPlugin` is installed, and it rewrites the text
	// content of its element. `baseText` returns the key itself until the setup entry loads
	// english. `RouterLink` renders as an anchor only through the base stub.
	template: `
		<div>
			<span data-test-id="label">{{ i18n.baseText('generic.cancel') }}</span>
			<span data-test-id="truncated" v-n8n-truncate:4="'abcdefgh'"></span>
			<span data-test-id="store">{{ store.label() }}</span>
			<RouterLink to="/somewhere">link</RouterLink>
		</div>
	`,
});

describe('the shared renderer', () => {
	it('installs i18n, the design system and a RouterLink stub', () => {
		const render = createComponentRenderer(Probe);

		const { getByTestId, getByText } = render({ pinia: createTestingPinia() });

		expect(getByTestId('label')).toHaveTextContent('Cancel');
		expect(getByTestId('truncated')).toHaveTextContent('abcd...');
		expect(getByText('link').tagName).toBe('A');
	});

	it('reaches a pinia store through mockedStore', () => {
		const pinia = createTestingPinia();
		const counter = mockedStore(useCounterStore);
		counter.label.mockReturnValue('count: 42');

		const { getByTestId } = createComponentRenderer(Probe)({ pinia });

		expect(getByTestId('store')).toHaveTextContent('count: 42');
	});

	it('installs a no-op $telemetry so a track() call cannot throw', () => {
		const Tracker = defineComponent({
			mounted() {
				(this as unknown as { $telemetry: { track: (name: string) => void } }).$telemetry.track(
					'rendered',
				);
			},
			template: '<div data-test-id="tracked" />',
		});

		const { getByTestId } = createComponentRenderer(Tracker)({ pinia: createTestingPinia() });

		expect(getByTestId('tracked')).toBeInTheDocument();
	});
});

const Labelled = defineComponent({
	props: { label: { type: String, default: '' }, hint: { type: String, default: '' } },
	template: '<span data-test-id="labelled">{{ label }}|{{ hint }}</span>',
});

describe('the { merge: true } option', () => {
	// No test pins the "defaults stay clean" property yet: `merge` mutates them, and three
	// editor-ui suites depend on that. See the comment on the `merge` call in `render.ts`.

	it('still merges the call options over the defaults', () => {
		const render = createComponentRenderer(Labelled, { props: { label: 'default' } });

		const { getByTestId } = render({ props: { hint: 'from the call' } }, { merge: true });

		expect(getByTestId('labelled').textContent).toBe('default|from the call');
	});
});

describe('defineRenderer', () => {
	const ProvideKey = Symbol('provided');

	const Consumer = defineComponent({
		setup: () => ({ provided: inject<number>(ProvideKey) }),
		template: '<span data-test-id="provided">{{ provided }}</span>',
	});

	it('adds the extension plugins, stubs and provides on top of the base', () => {
		const marker: string[] = [];
		const MarkerPlugin: Plugin = { install: () => marker.push('installed') };

		const { createComponentRenderer: create } = defineRenderer({
			plugins: [MarkerPlugin],
			// eslint-disable-next-line @typescript-eslint/naming-convention
			stubs: { RouterLink: { template: '<b><slot /></b>' } },
			provide: () => ({ [ProvideKey]: 1 }),
		});

		const { getByTestId } = create(Consumer)({ pinia: createTestingPinia() });

		expect(marker).toEqual(['installed']);
		expect(getByTestId('provided')).toHaveTextContent('1');
	});

	it('calls the provide thunk once per render, not once per definition', () => {
		let calls = 0;
		const { createComponentRenderer: create } = defineRenderer({
			provide: () => {
				calls += 1;
				return { [ProvideKey]: calls };
			},
		});
		const render = create(Consumer);

		render({ pinia: createTestingPinia() });
		// Both renders stay in the document, in order, so index 1 is the second one.
		const { getAllByTestId } = render({ pinia: createTestingPinia() });

		// A frozen object would hand the second render the first render's store.
		expect(calls).toBe(2);
		expect(getAllByTestId('provided')[1]).toHaveTextContent('2');
	});

	it('lets a caller override a provided value', () => {
		const { createComponentRenderer: create } = defineRenderer({
			provide: () => ({ [ProvideKey]: 1 }),
		});

		const { getByTestId } = create(Consumer)({
			pinia: createTestingPinia(),
			global: { provide: { [ProvideKey]: 9 } },
		});

		expect(getByTestId('provided')).toHaveTextContent('9');
	});
});
