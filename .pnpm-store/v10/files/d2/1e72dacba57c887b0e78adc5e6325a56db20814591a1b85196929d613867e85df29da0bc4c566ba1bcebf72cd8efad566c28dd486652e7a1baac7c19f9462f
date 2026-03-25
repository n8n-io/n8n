export type Options = {
	/**
	 * When true, adds the "browser" conditions.
	 * Otherwise the "node" condition is enabled.
	 * @default false
	 */
	browser?: boolean;
	/**
	 * Any custom conditions to match.
	 * @note Array order does not matter. Priority is determined by the key-order of conditions defined within a package's imports/exports mapping.
	 * @default []
	 */
	conditions?: readonly string[];
	/**
	 * When true, adds the "require" condition.
	 * Otherwise the "import" condition is enabled.
	 * @default false
	 */
	require?: boolean;
	/**
	 * Prevents "require", "import", "browser", and/or "node" conditions from being added automatically.
	 * When enabled, only `options.conditions` are added alongside the "default" condition.
	 * @important Enabling this deviates from Node.js default behavior.
	 * @default false
	 */
	unsafe?: boolean;
}

export function resolve<T=Package>(pkg: T, entry?: string, options?: Options): Imports.Output | Exports.Output | void;
export function imports<T=Package>(pkg: T, entry?: string, options?: Options): Imports.Output | void;
export function exports<T=Package>(pkg: T, target: string, options?: Options): Exports.Output | void;

export function legacy<T=Package>(pkg: T, options: { browser: true, fields?: readonly string[] }): Browser | void;
export function legacy<T=Package>(pkg: T, options: { browser: string, fields?: readonly string[] }): string | false | void;
export function legacy<T=Package>(pkg: T, options: { browser: false, fields?: readonly string[] }): string | void;
export function legacy<T=Package>(pkg: T, options?: {
	browser?: boolean | string;
	fields?: readonly string[];
}): Browser | string;

// ---

/**
 * A resolve condition
 * @example "node", "default", "production"
 */
export type Condition = string;

/** An internal file path */
export type Path = `./${string}`;

export type Imports = {
	[entry: Imports.Entry]: Imports.Value;
}

export namespace Imports {
	export type Entry = `#${string}`;

	type External = string;

	/** strings are dependency names OR internal paths */
	export type Value = External | Path | null | {
		[c: Condition]: Value;
	} | Value[];


	export type Output = Array<External|Path>;
}

export type Exports = Path | {
	[path: Exports.Entry]: Exports.Value;
	[cond: Condition]: Exports.Value;
}

export namespace Exports {
	/** Allows "." and "./{name}" */
	export type Entry = `.${string}`;

	/** strings must be internal paths */
	export type Value = Path | null | {
		[c: Condition]: Value;
	} | Value[];

	export type Output = Path[];
}

export type Package = {
	name: string;
	version?: string;
	module?: string;
	main?: string;
	imports?: Imports;
	exports?: Exports;
	browser?: Browser;
	[key: string]: any;
}

export type Browser = string[] | string | {
	[file: Path | string]: string | false;
}
