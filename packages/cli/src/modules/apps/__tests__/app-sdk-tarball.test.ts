import { gunzipSync } from 'node:zlib';
import { Parser } from 'tar';

import { buildAppSdkTarball, getAppSdkTarball } from '../app-sdk-tarball';

const listEntries = (tarball: Buffer) => {
	const paths: string[] = [];
	const parser = new Parser({
		onReadEntry: (entry) => {
			paths.push(entry.path);
			entry.resume();
		},
	});
	parser.end(gunzipSync(tarball));
	return paths;
};

describe('app-sdk-tarball', () => {
	it('packs package.json and dist under package/', async () => {
		const entries = listEntries(await buildAppSdkTarball());

		expect(entries).toContain('package/package.json');
		expect(entries).toContain('package/dist/index.js');
		expect(entries).toContain('package/dist/index.d.ts');
		expect(entries.filter((p) => p.endsWith('.tsbuildinfo'))).toEqual([]);
		expect(entries).toEqual([...entries].sort());
	});

	it('produces identical bytes on every build', async () => {
		const [first, second] = await Promise.all([buildAppSdkTarball(), buildAppSdkTarball()]);

		expect(first.equals(second)).toBe(true);
	});

	it('caches the tarball per process', async () => {
		const first = await getAppSdkTarball();

		expect(await getAppSdkTarball()).toBe(first);
	});
});
