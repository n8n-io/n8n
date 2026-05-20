import { vi } from 'vitest';

const mockState = vi.hoisted(() => ({
	loaderCalls: new Map<string, number>(),
	bodies: { smile: '<path data-icon="smile" />', star: '<path data-icon="star" />' } as Record<
		string,
		string
	>,
}));

vi.mock('virtual:lucide-icons', () => ({
	default: Object.fromEntries(
		Object.entries(mockState.bodies).map(([name, body]) => [
			name,
			async () => {
				mockState.loaderCalls.set(name, (mockState.loaderCalls.get(name) ?? 0) + 1);
				return { default: body };
			},
		]),
	),
}));

import { loadLucideIconBody } from './index';

describe('loadLucideIconBody', () => {
	beforeEach(() => {
		mockState.loaderCalls.clear();
	});

	it('returns the SVG body string for a known icon', async () => {
		const body = await loadLucideIconBody('smile');
		expect(body).toBe('<path data-icon="smile" />');
	});

	it('returns null for an unknown icon', async () => {
		const body = await loadLucideIconBody('this-icon-does-not-exist');
		expect(body).toBeNull();
	});

	it('caches results so the loader runs once per name', async () => {
		await loadLucideIconBody('star');
		await loadLucideIconBody('star');
		await loadLucideIconBody('star');

		expect(mockState.loaderCalls.get('star')).toBe(1);
	});
});
