import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoRestrictedGlobalsRule } from './no-restricted-globals.js';

const ruleTester = new RuleTester();

ruleTester.run('no-restricted-globals', NoRestrictedGlobalsRule, {
	valid: [
		{
			code: 'const result = someFunction();',
		},
		{
			code: 'window.setTimeout(() => {}, 1000);',
		},
		{
			code: 'const obj = { global: "allowed" };',
		},
		{
			code: 'function process() { return "allowed"; }',
		},
		{
			code: 'console.clearInterval;',
		},
		{
			code: 'const obj = { __dirname: "allowed", Buffer: "allowed", require: "allowed" };',
		},
		{
			code: 'function globalThis() { return "allowed"; }',
		},
		{
			code: 'const helper = require("./helper");',
		},
		{
			name: 'variable declarations should be allowed',
			code: 'const process = "my-process"; let global = "my-global";',
		},
		{
			name: 'function parameters should be allowed',
			code: 'function test(process, global, setTimeout) { return process; }',
		},
		{
			name: 'arrow function parameters should be allowed',
			code: 'const fn = (process, global) => process + global;',
		},
		{
			name: 'destructuring should be allowed',
			code: 'const { process, global } = someObject; const [setTimeout] = someArray;',
		},
		{
			name: 'class methods should be allowed',
			code: 'class MyClass { process() {} global = "value"; }',
		},
		{
			name: 'import should be allowed',
			code: 'import { process } from "./utils";',
		},
		{
			name: 'function expressions should be allowed',
			code: 'const fn = function process() {}; const fn2 = function global() {};',
		},
		{
			name: 'locally declared variables should not trigger false positives',
			code: `
const process = require('process');
const global = {};
const setTimeout = () => {};
function clearInterval() {}
let setInterval;
var __dirname = '/path';
const __filename = 'file.js';
			`,
		},
	],
	invalid: [
		{
			code: 'const pid = process.pid;',
			errors: [{ messageId: 'restrictedGlobal', data: { name: 'process' } }],
		},
		{
			code: 'global.myVar = "test";',
			errors: [{ messageId: 'restrictedGlobal', data: { name: 'global' } }],
		},
		{
			code: 'setTimeout(() => {}, 1000);',
			errors: [{ messageId: 'restrictedGlobal', data: { name: 'setTimeout' } }],
		},
		{
			code: 'clearInterval(timer);',
			errors: [{ messageId: 'restrictedGlobal', data: { name: 'clearInterval' } }],
		},
		{
			code: 'clearTimeout(timer);',
			errors: [{ messageId: 'restrictedGlobal', data: { name: 'clearTimeout' } }],
		},
		{
			code: 'setInterval(() => {}, 1000);',
			errors: [{ messageId: 'restrictedGlobal', data: { name: 'setInterval' } }],
		},
		{
			code: `
const fn = () => {
	process.exit(0);
	global.something = true;
};`,
			errors: [
				{ messageId: 'restrictedGlobal', data: { name: 'process' } },
				{ messageId: 'restrictedGlobal', data: { name: 'global' } },
			],
		},
		{
			name: 'SECURITY: __dirname usage',
			code: 'const currentDir = __dirname;',
			errors: [{ messageId: 'restrictedGlobal', data: { name: '__dirname' } }],
		},
		{
			name: 'SECURITY: __filename usage',
			code: 'console.log(__filename);',
			errors: [{ messageId: 'restrictedGlobal', data: { name: '__filename' } }],
		},
		{
			name: 'SECURITY: globalThis usage',
			code: 'globalThis.myVar = "test";',
			errors: [{ messageId: 'restrictedGlobal', data: { name: 'globalThis' } }],
		},
		{
			name: 'SECURITY: setImmediate usage',
			code: 'setImmediate(() => {});',
			errors: [{ messageId: 'restrictedGlobal', data: { name: 'setImmediate' } }],
		},
		{
			name: 'SECURITY: clearImmediate usage',
			code: 'clearImmediate(immediate);',
			errors: [{ messageId: 'restrictedGlobal', data: { name: 'clearImmediate' } }],
		},
	],
});
