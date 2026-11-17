import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { applyPrototypeHardening, isPrototypeHardeningEnabled } from '@/prototype-hardening';

// The spy stands in for the real lock, so this process stays unchanged.
describe('applyPrototypeHardening', () => {
	const security = { disablePrototypeHardening: false };
	mockInstance(GlobalConfig, { security });

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('locks Object.prototype', () => {
		security.disablePrototypeHardening = false;
		const preventExtensions = vi.spyOn(Object, 'preventExtensions').mockImplementation((o) => o);

		applyPrototypeHardening();

		expect(isPrototypeHardeningEnabled()).toBe(true);
		expect(preventExtensions).toHaveBeenCalledWith(Object.prototype);
	});

	it('does nothing when prototype hardening is turned off', () => {
		security.disablePrototypeHardening = true;
		const preventExtensions = vi.spyOn(Object, 'preventExtensions').mockImplementation((o) => o);

		applyPrototypeHardening();

		expect(isPrototypeHardeningEnabled()).toBe(false);
		expect(preventExtensions).not.toHaveBeenCalledWith(Object.prototype);
	});
});

// The real lock changes the process for good, so each case runs it in a child process.
describe('applyPrototypeHardening in a child process', () => {
	const cliDir = path.resolve(__dirname, '../..');
	let userFolder: string;

	beforeAll(() => {
		userFolder = mkdtempSync(path.join(tmpdir(), 'n8n-prototype-hardening-'));
	});

	afterAll(() => {
		rmSync(userFolder, { recursive: true, force: true });
	});

	const runHardened = (check: string): unknown => {
		const script = `require('reflect-metadata');
const { applyPrototypeHardening } = require('./dist/prototype-hardening');
applyPrototypeHardening();
const report = (value) => process.stdout.write('result:' + JSON.stringify(value) + '\\n');
${check}`;
		const result = spawnSync(process.execPath, ['-e', script], {
			cwd: cliDir,
			env: { PATH: process.env.PATH, N8N_USER_FOLDER: userFolder },
			encoding: 'utf8',
			timeout: 30_000,
		});
		const line = result.stdout.split('\n').find((l) => l.startsWith('result:'));
		if (!line) throw new Error(`No result from child process: ${result.stderr}`);
		return JSON.parse(line.slice('result:'.length));
	};

	it('refuses new properties on Object.prototype', () => {
		expect(
			runHardened(`let defineThrew = false;
try { Object.defineProperty(Object.prototype, 'added', { value: 1 }); } catch { defineThrew = true; }
report({ set: Reflect.set(Object.prototype, 'added', 1), defineThrew, inherited: 'added' in {} });`),
		).toEqual({ set: false, defineThrew: true, inherited: false });
	});

	it('refuses keys added through an inherited lookup', () => {
		expect(
			runHardened(`(function () {
	'use strict';
	const dictionary = {};
	let threw = false;
	try { (dictionary['__proto__'] ?? {}).added = 1; } catch { threw = true; }
	report({ threw, inherited: 'added' in {} });
})();`),
		).toEqual({ threw: true, inherited: false });
	});

	it('keeps the __proto__ accessor working', () => {
		expect(
			runHardened(`class Base {}
const target = {};
target.__proto__ = { x: 1 };
report({
	classRead: new Base().__proto__ === Base.prototype,
	plainRead: ({}).__proto__ === Object.prototype,
	write: target.x,
});`),
		).toEqual({ classRead: true, plainRead: true, write: 1 });
	});

	it('is safe to call twice', () => {
		expect(
			runHardened(`applyPrototypeHardening();
report({ extensible: Object.isExtensible(Object.prototype) });`),
		).toEqual({ extensible: false });
	});
});
