import { isJSON } from './objects.js';
import * as fs from 'fs';
export class FileMap {
    path;
    get [Symbol.toStringTag]() {
        return 'FileMap';
    }
    constructor(path) {
        this.path = path;
        if (!path) {
            throw new ReferenceError('No path specified');
        }
    }
    get size() {
        return this._map.size;
    }
    get [Symbol.iterator]() {
        return this._map[Symbol.iterator].bind(this._map);
    }
    get keys() {
        return this._map.keys.bind(this._map);
    }
    get values() {
        return this._map.values.bind(this._map);
    }
    get entries() {
        return this._map.entries.bind(this._map);
    }
    get forEach() {
        return this._map.forEach.bind(this._map);
    }
}
/**
 * A Map overlaying a JSON file
 */
export class JSONFileMap extends FileMap {
    options;
    get [Symbol.toStringTag]() {
        return 'JSONFileMap';
    }
    constructor(path, options) {
        super(path);
        this.options = options;
        if (!fs.existsSync(path)) {
            fs.writeFileSync(path, '{}');
        }
    }
    get _map() {
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
    _write(map) {
        if (!fs.existsSync(this.path)) {
            fs.writeFileSync(this.path, '{}');
        }
        const content = JSON.stringify(Object.fromEntries(map));
        fs.writeFileSync(this.path, content);
    }
    clear() {
        fs.writeFileSync(this.path, '{}');
    }
    delete(key) {
        const map = this._map;
        const rt = map.delete(key);
        this._write(map);
        return rt;
    }
    get(key) {
        return this._map.get(key);
    }
    has(key) {
        return this._map.has(key);
    }
    set(key, value) {
        const map = this._map;
        map.set(key, value);
        this._write(map);
        return this;
    }
}
/**
 * A Map overlaying a folder
 */
export class FolderMap extends FileMap {
    options;
    get [Symbol.toStringTag]() {
        return 'FolderMap';
    }
    constructor(path, options) {
        super(path);
        this.options = options;
    }
    get _names() {
        return fs
            .readdirSync(this.path)
            .filter(p => p.endsWith(this.options.suffix || ''))
            .map(p => p.slice(0, -this.options.suffix.length));
    }
    _join(path) {
        return `${this.path}/${path}${this.options.suffix}`;
    }
    get _map() {
        const entries = [];
        for (const name of this._names) {
            const content = fs.readFileSync(this._join(name), 'utf8');
            entries.push([name, content]);
        }
        return new Map(entries);
    }
    clear() {
        for (const name of this._names) {
            fs.unlinkSync(this._join(name));
        }
    }
    delete(key) {
        if (!this.has(key)) {
            return false;
        }
        fs.unlinkSync(this._join(key));
        return true;
    }
    get(key) {
        if (!this.has(key)) {
            throw new ReferenceError('Key not found');
        }
        return fs.readFileSync(this._join(key), 'utf8');
    }
    has(key) {
        return this._names.includes(key);
    }
    set(key, value) {
        fs.writeFileSync(this._join(key), value);
        return this;
    }
}
export function gitCommitHash(repo = '.') {
    repo = repo.replaceAll(/\/+/g, '/').replaceAll(/\/$/g, '');
    const rev = fs
        .readFileSync(repo + '/.git/HEAD')
        .toString()
        .trim();
    if (rev.indexOf(':') === -1) {
        return rev;
    }
    else {
        return fs
            .readFileSync(repo + '/.git/' + rev.substring(5))
            .toString()
            .trim();
    }
}
