import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { HiddenNodeTypes, hiddenNodeTypeNames } from '../hidden-node-types';

describe('hiddenNodeTypeNames', () => {
	it('reads the flag of the highest version of each type', () => {
		const names = hiddenNodeTypeNames([
			{ name: 'a', version: 1, hidden: true },
			{ name: 'a', version: [2, 3] },
			{ name: 'b', version: 2, hidden: true },
			{ name: 'b', version: 1 },
			{ name: 'c', version: 1 },
			{ name: 'd', version: 1, hidden: 'true' },
			'not a description',
		]);

		expect([...names]).toEqual(['b']);
	});
});

describe('HiddenNodeTypes', () => {
	let staticCacheDir: string;

	beforeEach(async () => {
		staticCacheDir = await mkdtemp(path.join(tmpdir(), 'hidden-node-types-'));
	});

	afterEach(async () => {
		await rm(staticCacheDir, { recursive: true, force: true });
	});

	const create = () => new HiddenNodeTypes(mock<InstanceSettings>({ staticCacheDir }));

	const writeTypes = async (content: string) => {
		await mkdir(path.join(staticCacheDir, 'types'), { recursive: true });
		await writeFile(path.join(staticCacheDir, 'types/nodes.json'), content);
	};
	const hidden = (name: string) => JSON.stringify([{ name, version: 1, hidden: true }]);

	it('parses the file again only when it changes', async () => {
		const filePath = path.join(staticCacheDir, 'types/nodes.json');
		const writeAt = async (content: string, time: Date) => {
			await writeTypes(content);
			await utimes(filePath, time, time);
		};
		const hiddenNodeTypes = create();

		await writeAt(hidden('first'), new Date('2026-01-01T00:00:00Z'));
		expect([...(await hiddenNodeTypes.get())]).toEqual(['first']);

		await writeAt(hidden('second'), new Date('2026-01-01T00:00:00Z'));
		expect([...(await hiddenNodeTypes.get())]).toEqual(['first']);

		await writeAt(hidden('second'), new Date('2026-01-01T00:00:01Z'));
		expect([...(await hiddenNodeTypes.get())]).toEqual(['second']);
	});

	it('fails when the file cannot be read, and reads it again on the next call', async () => {
		const hiddenNodeTypes = create();
		await expect(hiddenNodeTypes.get()).rejects.toThrow();

		await writeTypes('{ not json');
		await expect(hiddenNodeTypes.get()).rejects.toThrow();

		await writeTypes(hidden('recovered'));
		expect([...(await hiddenNodeTypes.get())]).toEqual(['recovered']);
	});
});
