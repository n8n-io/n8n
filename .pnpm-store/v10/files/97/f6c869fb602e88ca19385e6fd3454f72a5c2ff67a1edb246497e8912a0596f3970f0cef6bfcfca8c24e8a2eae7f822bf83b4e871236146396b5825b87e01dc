"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
/**
 * A simple cache for storing values that need to be accessed globally.
 */
class Cache extends Map {
    static instance;
    constructor() {
        super();
        this.set('@oclif/core', this.getOclifCoreMeta());
    }
    static getInstance() {
        if (!Cache.instance) {
            Cache.instance = new Cache();
        }
        return Cache.instance;
    }
    get(key) {
        return super.get(key);
    }
    getOclifCoreMeta() {
        try {
            return { name: '@oclif/core', version: require('@oclif/core/package.json').version };
        }
        catch {
            try {
                return {
                    name: '@oclif/core',
                    version: JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(__dirname, '..', 'package.json'), 'utf8')).version,
                };
            }
            catch {
                return { name: '@oclif/core', version: 'unknown' };
            }
        }
    }
}
exports.default = Cache;
