"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-deprecated */
require("chai/register-should.js");
const editorconfig = __importStar(require("./index.js"));
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const node_buffer_1 = require("node:buffer");
describe('parse', () => {
    const expected = {
        indent_style: 'space',
        indent_size: 2,
        end_of_line: 'lf',
        charset: 'utf-8',
        trim_trailing_whitespace: true,
        insert_final_newline: true,
        tab_width: 2,
        block_comment: '*',
        block_comment_end: '*/',
        block_comment_start: '/**',
    };
    const target = path.join(__dirname, '/app.js');
    it('async', async () => {
        const cfg = await editorconfig.parse(target);
        cfg.should.eql(expected);
    });
    it('sync', () => {
        const visited = [];
        const cfg = editorconfig.parseSync(target, { files: visited });
        cfg.should.eql(expected);
        visited.should.have.lengthOf(1);
        visited[0].glob.should.eql('*');
        visited[0].fileName.should.match(/\.editorconfig$/);
    });
    it('caches', async () => {
        const cache = new Map();
        const cfg = await editorconfig.parse(target, { cache });
        cfg.should.eql(expected);
        cache.size.should.be.eql(2);
        await editorconfig.parse(target, { cache });
        cache.size.should.be.eql(2);
    });
    it('caches sync', () => {
        const cache = new Map();
        const cfg = editorconfig.parseSync(target, { cache });
        cfg.should.eql(expected);
        cache.size.should.be.eql(2);
        editorconfig.parseSync(target, { cache });
        cache.size.should.be.eql(2);
    });
});
describe('parseFromFiles', () => {
    const expected = {
        block_comment_end: '*/',
        block_comment_start: '/**',
        block_comment: '*',
        charset: 'utf-8',
        end_of_line: 'lf',
        indent_size: 2,
        indent_style: 'space',
        insert_final_newline: true,
        tab_width: 2,
        trim_trailing_whitespace: true,
    };
    const configs = [];
    const configPath = path.resolve(__dirname, '../.editorconfig');
    configs.push({
        name: configPath,
        contents: fs.readFileSync(configPath),
    });
    const target = path.join(__dirname, '/app.js');
    const configs2 = [
        { name: 'early', contents: node_buffer_1.Buffer.alloc(0) },
        configs[0],
    ];
    it('async', async () => {
        const cfg = await editorconfig.parseFromFiles(target, Promise.resolve(configs));
        cfg.should.eql(expected);
    });
    it('sync', () => {
        const cfg = editorconfig.parseFromFilesSync(target, configs);
        cfg.should.eql(expected);
    });
    it('handles null', () => {
        const cfg = editorconfig.parseFromFilesSync(target, [{
                name: configPath,
                contents: node_buffer_1.Buffer.from('[*]\nfoo = null\n'),
            }]);
        cfg.should.eql({ foo: 'null' });
    });
    it('caches async', async () => {
        const cache = new Map();
        const cfg = await editorconfig.parseFromFiles(target, Promise.resolve(configs2), { cache });
        cfg.should.eql(expected);
        cache.size.should.be.eql(2);
        const cfg2 = await editorconfig.parseFromFiles(target, Promise.resolve(configs2), { cache });
        cfg2.should.eql(expected);
        cache.size.should.be.eql(2);
    });
    it('caches sync', () => {
        const cache = new Map();
        const cfg = editorconfig.parseFromFilesSync(target, configs2, { cache });
        cfg.should.eql(expected);
        cache.size.should.be.eql(2);
        const cfg2 = editorconfig.parseFromFilesSync(target, configs2, { cache });
        cfg2.should.eql(expected);
        cache.size.should.be.eql(2);
    });
    it('handles minimatch escapables', () => {
        // Note that this `#` does not actually test the /^#/ escaping logic,
        // because this path will go through a `path.dirname` before that happens.
        // It's here to catch what would happen if minimatch started to treat #
        // differently inside a pattern.
        const bogusPath = path.resolve(__dirname, '#?*+@!()|[]{}');
        const escConfigs = [
            {
                name: `${bogusPath}/.editorconfig`,
                contents: configs[0].contents,
            },
        ];
        const escTarget = `${bogusPath}/app.js`;
        const cfg = editorconfig.parseFromFilesSync(escTarget, escConfigs);
        cfg.should.eql(expected);
    });
});
describe('parseString', () => {
    const expected = [
        [null, { root: 'true' }],
        ['*', {
                block_comment_end: '*/',
                block_comment_start: '/**',
                block_comment: '*',
                charset: 'utf-8',
                end_of_line: 'lf',
                indent_size: '2',
                indent_style: 'space',
                insert_final_newline: 'true',
                trim_trailing_whitespace: 'true',
            }],
        ['*.md', { indent_size: '4' }],
    ];
    const configPath = path.resolve(__dirname, '../.editorconfig');
    const contents = fs.readFileSync(configPath, 'utf8');
    it('sync', () => {
        const cfg = editorconfig.parseString(contents);
        cfg.should.eql(expected);
    });
    it('handles errors', () => {
        const cfg = editorconfig.parseString('root: ');
        cfg.should.eql([[null, {}]]);
    });
    it('handles backslashes in glob', () => {
        const cfg = editorconfig.parseString('[a\\\\b]');
        cfg.should.eql([[null, {}], ['a\\\\b', {}]]);
    });
    it('handles blank comments', () => {
        const cfg = editorconfig.parseString('#');
        cfg.should.eql([[null, {}]]);
    });
});
describe('extra behavior', () => {
    it('handles extended globs', () => {
        // These failed when we had noext: true in matchOptions
        const matcher = editorconfig.matcher({
            root: __dirname,
        }, node_buffer_1.Buffer.from(`\
[*]
indent_size = 4

[!(package).json]
indent_size = 3`));
        matcher(path.join(__dirname, 'package.json')).should.include({ indent_size: 4 });
        matcher(path.join(__dirname, 'foo.json')).should.include({ indent_size: 3 });
    });
});
describe('unset', () => {
    it('pair witht the value `unset`', () => {
        const matcher = editorconfig.matcher({
            root: __dirname,
            unset: true,
        }, node_buffer_1.Buffer.from(`\
[*]
indent_size = 4

[*.json]
indent_size = unset
`));
        matcher(path.join(__dirname, 'index.js')).should.include({ indent_size: 4 });
        matcher(path.join(__dirname, 'index.json')).should.be.eql({});
    });
});
