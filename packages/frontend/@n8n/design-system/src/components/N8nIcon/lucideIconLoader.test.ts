import { beforeEach, describe, expect, it, vi } from 'vitest';

const chunkImporters = vi.hoisted(() => ({
	loadShapes: vi.fn(async () => ({
		lucideBodyChunk: {
			smile: '<circle cx="12" cy="12" r="10" />',
			star: '<polygon points="12 2 15 9 22 9 17 14 18 21 12 17 6 21 7 14 2 9 9 9" />',
		},
	})),
	loadHearts: vi.fn(async () => ({
		lucideBodyChunk: {
			heart: '<path d="M12 21C12 21 3 13 3 8C3 5 5 3 8 3" />',
		},
	})),
}));

vi.mock('./generated/lucideChunkIndex.generated', () => ({
	lucideIconChunkIndex: {
		smile: 'shapes',
		star: 'shapes',
		heart: 'hearts',
	},
	lucideBodyChunkLoaders: {
		shapes: chunkImporters.loadShapes,
		hearts: chunkImporters.loadHearts,
	},
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

		await expect(loadLucideIconBody('smile')).resolves.toBe('<circle cx="12" cy="12" r="10" />');
		expect(chunkImporters.loadShapes).toHaveBeenCalledTimes(1);
	});

	it('loads multiple icon bodies across chunks', async () => {
		const { loadLucideIconBodies } = await importLoader();

		await expect(loadLucideIconBodies(['smile', 'heart'])).resolves.toEqual({
			smile: '<circle cx="12" cy="12" r="10" />',
			heart: '<path d="M12 21C12 21 3 13 3 8C3 5 5 3 8 3" />',
		});
		expect(chunkImporters.loadShapes).toHaveBeenCalledTimes(1);
		expect(chunkImporters.loadHearts).toHaveBeenCalledTimes(1);
	});

	it('reuses cached icon bodies without re-importing the chunk', async () => {
		const { loadLucideIconBody } = await importLoader();

		await loadLucideIconBody('smile');
		await loadLucideIconBody('star');

		expect(chunkImporters.loadShapes).toHaveBeenCalledTimes(1);
	});

	it('dedupes concurrent loads for the same chunk', async () => {
		const { loadLucideIconBody } = await importLoader();

		const [smile, star] = await Promise.all([
			loadLucideIconBody('smile'),
			loadLucideIconBody('star'),
		]);

		expect(smile).toBe('<circle cx="12" cy="12" r="10" />');
		expect(star).toBe(
			'<polygon points="12 2 15 9 22 9 17 14 18 21 12 17 6 21 7 14 2 9 9 9" />',
		);
		expect(chunkImporters.loadShapes).toHaveBeenCalledTimes(1);
	});

	it('returns null for unknown icons', async () => {
		const { loadLucideIconBody, loadLucideIconBodies } = await importLoader();

		await expect(loadLucideIconBody('unknown-icon')).resolves.toBeNull();
		await expect(loadLucideIconBodies(['unknown-icon'])).resolves.toEqual({});
		expect(chunkImporters.loadShapes).not.toHaveBeenCalled();
		expect(chunkImporters.loadHearts).not.toHaveBeenCalled();
	});
});
