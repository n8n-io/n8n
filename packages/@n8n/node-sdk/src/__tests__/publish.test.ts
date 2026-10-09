import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { packAction } from '../pack';
import { checkPublish } from '../publish';
import { CONTAINER_GUEST, CONTAINER_IMAGE, containerRuntime } from '../runtimes/container';
import type { ContractFixtures } from '../version';

// Next to the guest, so docker shares it whenever it shares the guest. Colima shares no tmpdir.
const CACHE_ROOT = path.resolve(__dirname, '..', '..', 'node_modules', '.cache');
mkdirSync(CACHE_ROOT, { recursive: true });
const dir = mkdtempSync(path.join(CACHE_ROOT, 'publish-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const containerReady = (() => {
	try {
		containerRuntime();
		return existsSync(CONTAINER_GUEST);
	} catch {
		return false;
	}
})();

const packUid = async (image: string) => {
	const file = path.join(dir, 'uid.ts');
	writeFileSync(
		file,
		`import { defineNode, t } from '@n8n/node-sdk';
const probe = defineNode({ id: 'probe', displayName: 'Probe' });
export const uid = probe.action('uid', {
	action: 'Get the user id',
	summary: 'Give the user id of the process that runs the action.',
	flow: { effect: 'read', cardinality: 'per-item' },
	runtime: { image: '${image}' },
	input: {},
	output: t.obj({ uid: t.int() }),
	run: async () => ({ uid: typeof process === 'undefined' ? -1 : process.getuid() }),
});`,
	);
	return await packAction(file, 'uid');
};

const fixtures: ContractFixtures = {
	executions: [{ name: 'runs as the container user', params: {}, output: [{ uid: 10001 }] }],
};

describe('checkPublish of an action with an image', () => {
	it.skipIf(!containerReady)(
		'replays the fixtures in the container of the image',
		async () => {
			const packed = await packUid(CONTAINER_IMAGE);
			await expect(checkPublish(undefined, packed, fixtures)).resolves.toBeUndefined();
		},
		60_000,
	);

	it('fails when the container cannot start', async () => {
		const packed = await packUid(`node@sha256:${'0'.repeat(64)}`);
		await expect(checkPublish(undefined, packed, fixtures)).rejects.toThrow(
			'probe.uid@1.0.0 fails its fixtures: probe.uid@1.0.0: The container runtime',
		);
	}, 60_000);
});
