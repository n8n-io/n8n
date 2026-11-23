import { Chart } from 'chart.js';

import { registerCharts } from './registerCharts';

describe('registerCharts', () => {
	it('does not find the chart parts before the first call', () => {
		// Guards against a vacuous pass: if another import registered the parts,
		// the assertions after the call would prove nothing.
		expect(() => Chart.registry.getScale('category')).toThrow('is not a registered scale');
	});

	it('registers every part that the n8n charts use', () => {
		registerCharts();

		expect(Chart.registry.getScale('category')).toBeDefined();
		expect(Chart.registry.getScale('linear')).toBeDefined();
		expect(Chart.registry.getElement('bar')).toBeDefined();
		expect(Chart.registry.getElement('line')).toBeDefined();
		expect(Chart.registry.getElement('point')).toBeDefined();
		expect(Chart.registry.getPlugin('title')).toBeDefined();
		expect(Chart.registry.getPlugin('tooltip')).toBeDefined();
		expect(Chart.registry.getPlugin('legend')).toBeDefined();
		expect(Chart.registry.getController('line')).toBeDefined();
	});

	it('registers the parts only once when called again', () => {
		registerCharts();
		const register = vi.spyOn(Chart, 'register');

		registerCharts();

		expect(register).not.toHaveBeenCalled();
		register.mockRestore();
	});
});
