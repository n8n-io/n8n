import {
	BarController,
	BarElement,
	CategoryScale,
	Chart,
	Legend,
	LinearScale,
	LineController,
	LineElement,
	PointElement,
	Title,
	Tooltip,
} from 'chart.js';
import type * as VueChartjs from 'vue-chartjs';

// When `vue-chartjs` loads, its own `Bar`, `Line` and other typed charts register every
// controller. A production build drops those unused charts, so the registry alone cannot show
// that this module registers its controllers. The wrapper records what this module passes. It
// is a plain array, because the shared config resets `vi.fn()` call history between tests.
const createTypedChartCalls = vi.hoisted((): Array<[string, unknown]> => []);
vi.mock('vue-chartjs', async (importOriginal) => {
	const actual = await importOriginal<typeof VueChartjs>();
	return {
		...actual,
		createTypedChart: (...args: Parameters<typeof actual.createTypedChart>) => {
			createTypedChartCalls.push([args[0], args[1]]);
			return actual.createTypedChart(...args);
		},
	};
});

const sharedParts = [
	CategoryScale,
	LinearScale,
	BarElement,
	LineElement,
	PointElement,
	Title,
	Tooltip,
	Legend,
];

describe('charts', () => {
	it('does not register the chart parts before the module loads', () => {
		// Guards against a vacuous pass: if another import registered the parts,
		// the assertions after the import would prove nothing.
		expect(() => Chart.registry.getScale('category')).toThrow('is not a registered scale');
	});

	it('registers the scales, elements and plugins that n8n charts use when the module loads', async () => {
		await import('./index');

		expect(Chart.registry.getScale('category')).toBeDefined();
		expect(Chart.registry.getScale('linear')).toBeDefined();
		expect(Chart.registry.getElement('bar')).toBeDefined();
		expect(Chart.registry.getElement('line')).toBeDefined();
		expect(Chart.registry.getElement('point')).toBeDefined();
		expect(Chart.registry.getPlugin('title')).toBeDefined();
		expect(Chart.registry.getPlugin('tooltip')).toBeDefined();
		expect(Chart.registry.getPlugin('legend')).toBeDefined();
	});

	it.each([
		['Bar', 'bar', BarController],
		['Line', 'line', LineController],
	] as const)(
		'builds %s with its controller and the shared parts',
		async (name, type, controller) => {
			const charts = await import('./index');

			expect(charts[name]).toBeDefined();
			expect(createTypedChartCalls).toContainEqual([
				type,
				expect.arrayContaining([controller, ...sharedParts]),
			]);
		},
	);
});
