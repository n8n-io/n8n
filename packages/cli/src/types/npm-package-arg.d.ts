declare module 'npm-package-arg' {
	export type ResultType =
		| 'alias'
		| 'directory'
		| 'file'
		| 'git'
		| 'range'
		| 'remote'
		| 'tag'
		| 'version';

	export interface Result {
		raw: string;
		name?: string;
		scope?: string;
		rawSpec: string;
		registry?: boolean;
		type: ResultType;
		where?: string;
		subSpec?: Result;
	}

	interface NpmPackageArg {
		(arg: string, where?: string): Result;
		resolve(name: string | undefined, spec: string, where?: string, arg?: string): Result;
	}

	const npa: NpmPackageArg;
	export = npa;
}
