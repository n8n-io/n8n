import { jsonParse } from 'n8n-workflow';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Plain hoisted state, because the shared config restores vi.fn() mocks before each test
const fsState = vi.hoisted(() => ({
	reads: [] as string[],
	failWith: undefined as ((path: string) => Error | undefined) | undefined,
}));

vi.mock('node:fs/promises', async () => {
	const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
	return {
		...actual,
		readFile: async (...args: Parameters<typeof actual.readFile>) => {
			const path = String(args[0]);
			fsState.reads.push(path);
			const error = fsState.failWith?.(path);
			if (error) throw error;
			return await actual.readFile(...args);
		},
	};
});

const fsError = (code: string) => Object.assign(new Error(code), { code });

const packageJsonPath = resolve(__dirname, '../../../package.json');
const { version: packageVersion } = jsonParse<{ version: string }>(
	readFileSync(packageJsonPath, 'utf8'),
);

const loadFreshModule = async () => {
	vi.resetModules();
	return await import('./Weaviate.integration.js');
};

beforeEach(() => {
	fsState.reads.length = 0;
	fsState.failWith = undefined;
});

describe('resolvePackageVersion', () => {
	let root: string;

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), 'n8n-weaviate-version-'));
	});

	afterEach(() => {
		rmSync(root, { recursive: true, force: true });
	});

	const writePackageJson = (dir: string, contents: string) => {
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, 'package.json'), contents);
	};

	it('should read the version from the package.json in the start folder', async () => {
		const { resolvePackageVersion } = await loadFreshModule();
		writePackageJson(root, '{ "version": "1.2.3" }');

		await expect(resolvePackageVersion(root)).resolves.toBe('1.2.3');
	});

	it('should look in the parent folders when the start folder has no package.json', async () => {
		const { resolvePackageVersion } = await loadFreshModule();
		writePackageJson(root, '{ "version": "1.2.3" }');
		const start = join(root, 'dist', 'nodes');
		mkdirSync(start, { recursive: true });

		await expect(resolvePackageVersion(start)).resolves.toBe('1.2.3');
	});

	it('should skip a package.json that has no version', async () => {
		const { resolvePackageVersion } = await loadFreshModule();
		writePackageJson(root, '{ "version": "1.2.3" }');
		writePackageJson(join(root, 'nested'), '{ "name": "no-version" }');

		await expect(resolvePackageVersion(join(root, 'nested'))).resolves.toBe('1.2.3');
	});

	it('should throw for a malformed package.json, and not use one further up', async () => {
		const { resolvePackageVersion } = await loadFreshModule();
		writePackageJson(root, '{ "version": "1.2.3" }');
		writePackageJson(join(root, 'nested'), '{ not json');

		await expect(resolvePackageVersion(join(root, 'nested'))).rejects.toThrow();
	});

	it('should throw for a read error that is not a missing path', async () => {
		const { resolvePackageVersion } = await loadFreshModule();
		fsState.failWith = () => fsError('EACCES');

		await expect(resolvePackageVersion(root)).rejects.toThrow('EACCES');
	});

	it('should throw when no folder up to the root has a package.json', async () => {
		const { resolvePackageVersion } = await loadFreshModule();
		fsState.failWith = () => fsError('ENOENT');

		await expect(resolvePackageVersion(root)).rejects.toThrow(
			'Could not resolve the n8n-nodes-langchain package version',
		);
	});
});

describe('getIntegrationVersion', () => {
	it('should resolve the version of the nodes-langchain package', async () => {
		const { getIntegrationVersion } = await loadFreshModule();

		await expect(getIntegrationVersion()).resolves.toBe(packageVersion);
	});

	it('should read package.json one time, also for concurrent first calls', async () => {
		const { getIntegrationVersion } = await loadFreshModule();

		const results = await Promise.all([getIntegrationVersion(), getIntegrationVersion()]);
		results.push(await getIntegrationVersion());

		expect(results).toEqual([packageVersion, packageVersion, packageVersion]);
		expect(fsState.reads.filter((path) => path === packageJsonPath)).toHaveLength(1);
	});

	it('should retry after a transient filesystem error', async () => {
		const { getIntegrationVersion } = await loadFreshModule();
		fsState.failWith = () => fsError('EMFILE');
		await expect(getIntegrationVersion()).rejects.toThrow('EMFILE');

		fsState.failWith = undefined;

		await expect(getIntegrationVersion()).resolves.toBe(packageVersion);
	});

	it('should keep a permanent error cached', async () => {
		const { getIntegrationVersion } = await loadFreshModule();
		fsState.failWith = () => fsError('EACCES');
		await expect(getIntegrationVersion()).rejects.toThrow('EACCES');
		const readsAfterFailure = fsState.reads.length;

		fsState.failWith = undefined;

		await expect(getIntegrationVersion()).rejects.toThrow('EACCES');
		expect(fsState.reads).toHaveLength(readsAfterFailure);
	});
});

describe('getIntegrationHeaders', () => {
	it('should give the integration header with the package version', async () => {
		const { getIntegrationHeaders, INTEGRATION_HEADER } = await loadFreshModule();

		await expect(getIntegrationHeaders()).resolves.toEqual({
			[INTEGRATION_HEADER]: `n8n-langchain/${packageVersion}`,
		});
	});

	it('should give no headers when the version cannot be resolved', async () => {
		const { getIntegrationHeaders } = await loadFreshModule();
		fsState.failWith = () => fsError('EACCES');

		await expect(getIntegrationHeaders()).resolves.toEqual({});
	});
});
