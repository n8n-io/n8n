import { AppBuildError } from '../build/app-build.types';
import type { AppFiles } from '../storage/app-version-stores';
import { checkBuildSource, createAppScaffold } from './app-scaffold';

type MutableAppFiles = Map<string, Buffer>;

type PackageJson = {
	name: string;
	version: string;
	scripts: Record<string, string>;
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
};

type LockEntry = {
	version?: string;
	resolved?: string;
	integrity?: string;
	inBundle?: boolean;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
};

type PackageLock = {
	lockfileVersion: number;
	packages: Record<string, LockEntry>;
};

function readJson<T>(files: AppFiles, name: string): T {
	return JSON.parse(files.get(name)?.toString('utf8') ?? 'null') as T;
}

function writeJson(files: MutableAppFiles, name: string, value: unknown) {
	files.set(name, Buffer.from(`${JSON.stringify(value, null, 2)}\n`));
}

function appScaffold(): MutableAppFiles {
	return new Map(createAppScaffold());
}

function addDependency(files: MutableAppFiles, version = '5.0.0') {
	const packageJson = readJson<PackageJson>(files, 'package.json');
	const packageLock = readJson<PackageLock>(files, 'package-lock.json');
	packageJson.dependencies.nanoid = version;
	packageLock.packages[''].dependencies!.nanoid = version;
	packageLock.packages['node_modules/nanoid'] = {
		version,
		resolved: `https://registry.npmjs.org/nanoid/-/nanoid-${version}.tgz`,
		integrity: 'sha512-dGVzdA==',
	};
	writeJson(files, 'package.json', packageJson);
	writeJson(files, 'package-lock.json', packageLock);
}

describe('app scaffold package validation', () => {
	it('returns a stable dependency key for the scaffold', () => {
		const files = appScaffold();
		const key = checkBuildSource(files);
		const packageJson = readJson<PackageJson>(files, 'package.json');
		writeJson(files, 'package.json', packageJson);

		expect(checkBuildSource(files)).toBe(key);
	});

	it('accepts an exact public npm dependency and changes the dependency key', () => {
		const files = appScaffold();
		const scaffoldKey = checkBuildSource(files);
		addDependency(files);

		expect(checkBuildSource(files)).not.toBe(scaffoldKey);
	});

	it.each(['5.0.0-beta.1', '5.0.0+build.1'])(
		'accepts the exact dependency version %s',
		(version) => {
			const files = appScaffold();
			addDependency(files, version);

			expect(() => checkBuildSource(files)).not.toThrow();
		},
	);

	it.each(['^5.0.0', 'git+https://github.com/example/package.git', 'file:../package'])(
		'rejects the dependency version %s',
		(version) => {
			const files = appScaffold();
			addDependency(files, version);

			expect(() => checkBuildSource(files)).toThrow(AppBuildError);
		},
	);

	it('rejects dependencies outside the public npm registry', () => {
		const files = appScaffold();
		addDependency(files);
		const packageLock = readJson<PackageLock>(files, 'package-lock.json');
		packageLock.packages['node_modules/nanoid'].resolved =
			'https://packages.example.com/nanoid.tgz';
		writeJson(files, 'package-lock.json', packageLock);

		expect(() => checkBuildSource(files)).toThrow(AppBuildError);
	});

	it('rejects bundled dependencies outside the public npm registry', () => {
		const files = appScaffold();
		addDependency(files);
		const packageLock = readJson<PackageLock>(files, 'package-lock.json');
		packageLock.packages['node_modules/nanoid'].inBundle = true;
		packageLock.packages['node_modules/nanoid'].resolved =
			'https://packages.example.com/nanoid.tgz';
		writeJson(files, 'package-lock.json', packageLock);

		expect(() => checkBuildSource(files)).toThrow(AppBuildError);
	});

	it('rejects a lockfile that does not match package.json', () => {
		const files = appScaffold();
		addDependency(files);
		const packageLock = readJson<PackageLock>(files, 'package-lock.json');
		delete packageLock.packages[''].dependencies!.nanoid;
		writeJson(files, 'package-lock.json', packageLock);

		let error: unknown;
		try {
			checkBuildSource(files);
		} catch (caught) {
			error = caught;
		}
		expect(error).toBeInstanceOf(AppBuildError);
		expect(error).toMatchObject({ log: 'Package lock does not match package.json.' });
	});

	it('rejects changes to the build script', () => {
		const files = appScaffold();
		const packageJson = readJson<PackageJson>(files, 'package.json');
		packageJson.scripts.build = 'custom-build';
		writeJson(files, 'package.json', packageJson);

		expect(() => checkBuildSource(files)).toThrow(AppBuildError);
	});
});
