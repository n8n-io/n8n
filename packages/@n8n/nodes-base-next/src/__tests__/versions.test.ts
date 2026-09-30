import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { IExecuteFunctions } from 'n8n-workflow';

import { freezeAll, writeLock } from '../../scripts/freeze';
import { HttpRequestGet } from '../nodes/HttpRequestGet.node';
import { VERSIONS_DIR } from '../registry';

describe('frozen versions', () => {
	const copy = mkdtempSync(path.join(tmpdir(), 'nodes-base-next-versions-'));

	afterAll(() => rmSync(copy, { recursive: true, force: true }));

	it('match the source of every action, so a changed action needs a new version', async () => {
		cpSync(VERSIONS_DIR, copy, { recursive: true });
		const manifests = await freezeAll(copy);
		writeLock(copy);

		const unfrozen = manifests.filter(
			({ id, version }) => !existsSync(path.join(VERSIONS_DIR, id, String(version))),
		);
		expect(unfrozen.map(({ id, version }) => `${id}@${version}`)).toEqual([]);
		expect(readFileSync(path.join(copy, 'lock.json'), 'utf8')).toBe(
			readFileSync(path.join(VERSIONS_DIR, 'lock.json'), 'utf8'),
		);
	});

	it('run from the frozen bundle in the node class', async () => {
		const parameters: Record<string, unknown> = {
			authentication: 'none',
			url: 'https://api.test/items',
		};
		const context = {
			getInputData: () => [{ json: {} }],
			getNode: () => ({ name: 'GET', credentials: {} }),
			getNodeParameter: (name: string) => parameters[name],
			continueOnFail: () => false,
			helpers: { httpRequest: async () => [{ id: 1 }, { id: 2 }] },
		} as unknown as IExecuteFunctions;

		const result = await new HttpRequestGet().getNodeType(1).execute?.call(context);

		expect(result).toEqual([
			[
				{ json: { id: 1 }, pairedItem: { item: 0 } },
				{ json: { id: 2 }, pairedItem: { item: 0 } },
			],
		]);
	});
});
