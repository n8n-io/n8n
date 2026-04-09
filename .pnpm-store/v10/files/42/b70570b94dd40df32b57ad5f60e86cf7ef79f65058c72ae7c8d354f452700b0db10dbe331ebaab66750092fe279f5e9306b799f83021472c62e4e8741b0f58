import { isJSON, type JSONValue } from './objects.js';
import * as fs from 'fs';

export abstract class FileMap<V> implements Map<string, V> {
	public get [Symbol.toStringTag](): string {
		return 'FileMap';
	}

	public constructor(protected readonly path: string) {
		if (!path) {
			throw new ReferenceError('No path specified');
		}
	}

	protected abstract readonly _map: Map<string, V>;

	public abstract clear(): void;

	public abstract delete(key: string): boolean;

	public abstract get(key: string): V;

	public abstract has(key: string): boolean;

	public abstract set(key: string, value: V): this;

	public get size() {
		return this._map.size;
	}

	public get [Symbol.iterator]() {
		return this._map[Symbol.iterator].bind(this._map);
	}

	public get keys(): typeof this._map.keys {
		return this._map.keys.bind(this._map);
	}

	public get values(): typeof this._map.values {
		return this._map.values.bind(this._map);
	}

	public get entries(): typeof this._map.entries {
		return this._map.entries.bind(this._map);
	}

	public get forEach(): typeof this._map.forEach {
		return this._map.forEach.bind(this._map);
	}
}

export interface JSONFileMapOptions {
	/**
	 * Should an invalid JSON file be overwritten
	 */
	overwrite_invalid: boolean;
}

/**
 * A Map overlaying a JSON file
 */
export class JSONFileMap<T extends JSONValue = JSONValue> extends FileMap<T> {
	public get [Symbol.toStringTag](): 'JSONFileMap' {
		return 'JSONFileMap';
	}

	public constructor(
		path: string,
		public readonly options: JSONFileMapOptions
	) {
		super(path);
		if (!fs.existsSync(path)) {
			fs.writeFileSync(path, '{}');
		}
	}

	public get _map(): Map<string, T> {
		const content = fs.readFileSync(this.path, 'utf8');
		if (!isJSON(content)) {
			if (!this.options.overwrite_invalid) {
				throw new SyntaxError('Invalid JSON file: ' + this.path);
			}
			console.warn('Invalid JSON file (overwriting): ' + this.path);
			this.clear();
			return new Map();
		}
		return new Map(Object.entries(JSON.parse(content)));
	}

	public _write(map: Map<string, T>) {
		if (!fs.existsSync(this.path)) {
			fs.writeFileSync(this.path, '{}');
		}
		const content = JSON.stringify(Object.fromEntries(map));
		fs.writeFileSync(this.path, content);
	}

	public clear() {
		fs.writeFileSync(this.path, '{}');
	}

	public delete(key: string): boolean {
		const map = this._map;
		const rt = map.delete(key);
		this._write(map);
		return rt;
	}

	public get<U extends T>(key: string): U {
		return this._map.get(key) as U;
	}

	public has(key: string): boolean {
		return this._map.has(key);
	}

	public set(key: string, value: T): this {
		const map = this._map;
		map.set(key, value);
		this._write(map);
		return this;
	}
}

export interface FolderMapOptions {
	/**
	 * Suffix to append to keys to resolve file names
	 */
	suffix: string;
}

/**
 * A Map overlaying a folder
 */
export class FolderMap extends FileMap<string> {
	public get [Symbol.toStringTag](): 'FolderMap' {
		return 'FolderMap';
	}

	public constructor(
		path: string,
		public readonly options: Partial<FolderMapOptions>
	) {
		super(path);
	}

	protected get _names(): string[] {
		return fs
			.readdirSync(this.path)
			.filter(p => p.endsWith(this.options.suffix || ''))
			.map(p => p.slice(0, -this.options.suffix!.length));
	}

	protected _join(path: string): string {
		return `${this.path}/${path}${this.options.suffix}`;
	}

	protected get _map(): Map<string, string> {
		const entries: [string, string][] = [];
		for (const name of this._names) {
			const content = fs.readFileSync(this._join(name), 'utf8');
			entries.push([name, content]);
		}
		return new Map(entries);
	}

	public clear(): void {
		for (const name of this._names) {
			fs.unlinkSync(this._join(name));
		}
	}

	public delete(key: string): boolean {
		if (!this.has(key)) {
			return false;
		}

		fs.unlinkSync(this._join(key));
		return true;
	}

	public get(key: string): string {
		if (!this.has(key)) {
			throw new ReferenceError('Key not found');
		}
		return fs.readFileSync(this._join(key), 'utf8');
	}

	public has(key: string): boolean {
		return this._names.includes(key);
	}

	public set(key: string, value: string): this {
		fs.writeFileSync(this._join(key), value);
		return this;
	}
}

export function gitCommitHash(repo: string = '.'): string {
	repo = repo.replaceAll(/\/+/g, '/').replaceAll(/\/$/g, '');
	const rev = fs
		.readFileSync(repo + '/.git/HEAD')
		.toString()
		.trim();
	if (rev.indexOf(':') === -1) {
		return rev;
	} else {
		return fs
			.readFileSync(repo + '/.git/' + rev.substring(5))
			.toString()
			.trim();
	}
}
