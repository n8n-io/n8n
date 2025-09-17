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
			name: 'SECURITY: Buffer usage',
			code: 'const buf = Buffer.from("data");',
			errors: [{ messageId: 'restrictedGlobal', data: { name: 'Buffer' } }],
		},
		{
			name: 'SECURITY: require usage',
			code: 'const module = require("some-module");',
			errors: [{ messageId: 'restrictedGlobal', data: { name: 'require' } }],
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
