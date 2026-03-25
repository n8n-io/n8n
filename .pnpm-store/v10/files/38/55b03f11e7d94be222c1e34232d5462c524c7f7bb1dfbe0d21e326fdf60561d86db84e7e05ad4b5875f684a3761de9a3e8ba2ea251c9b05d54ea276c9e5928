"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrieNode = void 0;
const path_1 = require("path");
const helpers_1 = require("../helpers");
class TrieNode {
    constructor() {
        this.children = new Map();
        this.data = null;
    }
    add(name, data) {
        if (name.length <= 0)
            return;
        const node = this.children.has(name[0])
            ? this.children.get(name[0])
            : new TrieNode();
        if (name.length == 1) {
            node.data = data;
        }
        else {
            node.add(name.substring(1), data);
        }
        this.children.set(name[0], node);
    }
    search(name) {
        var _a;
        if (name.length <= 0)
            return null;
        const node = this.children.get(name[0]);
        return node
            ? name.length == 1
                ? node.data
                : (_a = node.search(name.substring(1))) !== null && _a !== void 0 ? _a : node.data
            : this.data;
    }
    static buildAliasTrie(config, paths) {
        const aliasTrie = new this();
        if (paths) {
            Object.keys(paths)
                .map((alias) => {
                return {
                    shouldPrefixMatchWildly: alias.endsWith('*'),
                    prefix: alias.replace(/\*$/, ''),
                    paths: paths[alias].map((path) => {
                        path = path
                            .replace(/\*$/, '')
                            .replace(/\.([mc])?ts(x)?$/, '.$1js$2');
                        if ((0, path_1.isAbsolute)(path)) {
                            path = (0, path_1.relative)((0, path_1.resolve)(config.configDir, config.baseUrl), path);
                        }
                        if ((0, path_1.normalize)(path).includes('..') &&
                            !config.configDirInOutPath) {
                            (0, helpers_1.relativeOutPathToConfigDir)(config);
                        }
                        return path;
                    })
                };
            })
                .forEach((alias) => {
                if (alias.prefix) {
                    aliasTrie.add(alias.prefix, Object.assign(Object.assign({}, alias), { paths: alias.paths.map((0, helpers_1.findBasePathOfAlias)(config)) }));
                }
            });
        }
        return aliasTrie;
    }
}
exports.TrieNode = TrieNode;
//# sourceMappingURL=trie.js.map