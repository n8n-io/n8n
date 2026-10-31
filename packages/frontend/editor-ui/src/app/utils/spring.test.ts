import { LIST_SPRING, springToCssEasing } from './spring';

describe('springToCssEasing', () => {
	it('should return a linear() easing that starts at 0 and ends at 1', () => {
		const { easing, durationMs } = springToCssEasing(LIST_SPRING);

		const values = easing.slice('linear('.length, -1).split(', ').map(Number);
		expect(values[0]).toBe(0);
		expect(values.at(-1)).toBe(1);
		expect(durationMs).toBeGreaterThan(0);
		expect(durationMs).toBeLessThan(2000);
	});

	it('should take longer to settle for a softer spring', () => {
		const stiff = springToCssEasing({ stiffness: 600, damping: 44, mass: 1 });
		const soft = springToCssEasing({ stiffness: 100, damping: 18, mass: 1 });

		expect(soft.durationMs).toBeGreaterThan(stiff.durationMs);
	});
});
