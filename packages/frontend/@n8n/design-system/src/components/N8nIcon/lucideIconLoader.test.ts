import { beforeEach, describe, expect, it, vi } from 'vitest';

const TEST_ICONS = vi.hoisted(() => ({
	smile: '<circle cx="12" cy="12" r="10" />',
	star: '<polygon points="12 2 15 9 22 9 17 14 18 21 12 17 6 21 7 14 2 9 9 9" />',
	heart: '<path d="M12 21C12 21 3 13 3 8C3 5 5 3 8 3" />',
}));

vi.mock('virtual:lucide-icon-loader', () => ({
	default: {
		smile: async () => ({ default: TEST_ICONS.smile }),
		star: async () => ({ default: TEST_ICONS.star }),
		heart: async () => ({ default: TEST_ICONS.heart }),
	},
}));

vi.mock('virtual:lucide-icons', () => ({
	default: TEST_ICONS,
}));

async function importLoader() {
	return await import('./lucideIconLoader');
}

describe('lucideIconLoader', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	it('loads a single icon body by name', async () => {
		const { loadLucideIconBody } = await importLoader();

		await expect(loadLucideIconBody('smile')).resolves.toBe(TEST_ICONS.smile);
	});

	it('loads multiple icon bodies', async () => {
		const { loadLucideIconBodies } = await importLoader();

		await expect(loadLucideIconBodies(['smile', 'heart'])).resolves.toEqual({
			smile: TEST_ICONS.smile,
			heart: TEST_ICONS.heart,
		});
	});

	it('reuses cached icon bodies without re-importing', async () => {
		const { loadLucideIconBody } = await importLoader();

		const first = await loadLucideIconBody('smile');
		const second = await loadLucideIconBody('smile');

		expect(first).toBe(second);
		expect(first).toBe(TEST_ICONS.smile);
	});

	it('handles concurrent loads for the same icon', async () => {
		const { loadLucideIconBody } = await importLoader();

		const [a, b] = await Promise.all([loadLucideIconBody('smile'), loadLucideIconBody('star')]);

		expect(a).toBe(TEST_ICONS.smile);
		expect(b).toBe(TEST_ICONS.star);
	});

	it('returns null for unknown icons', async () => {
		const { loadLucideIconBody, loadLucideIconBodies } = await importLoader();

		await expect(loadLucideIconBody('unknown-icon')).resolves.toBeNull();
		await expect(loadLucideIconBodies(['unknown-icon'])).resolves.toEqual({});
	});
});
