"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("chai/register-should.js");
const cli_js_1 = __importDefault(require("./cli.js"));
async function exec(...args) {
    const out = [];
    const err = [];
    const res = {
        stdout: '',
        stderr: '',
    };
    try {
        res.props = await (0, cli_js_1.default)(['node', 'editorconfig', ...args], {
            writeOut(s) {
                out.push(s);
            },
            writeErr(s) {
                err.push(s);
            },
        });
    }
    catch (er) {
        res.err = er;
    }
    if (out.length) {
        res.stdout = out.join('');
    }
    if (err.length) {
        res.stderr = err.join('');
    }
    return res;
}
describe('Command line interface', () => {
    it('helps', async () => {
        const res = await exec('--help');
        res.stdout.should.match(/^Usage:/);
    });
    it('Lists files', async () => {
        const res = await exec('foo.md', '--files');
        res.stdout.trim().should.match(/\.editorconfig \[\*\.md\]$/);
    });
    it('Lists multiple files', async () => {
        const res = await exec('foo.md', 'bar.js', '--files');
        res.stdout.should.match(/^\[foo\.md\]/);
        res.stdout.trim().should.match(/\.editorconfig \[\*\]$/);
    });
});
