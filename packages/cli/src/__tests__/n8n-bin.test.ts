import { createBinTestDir, readMarker, type BinTestDir } from '@test/bin-harness';

describe('bin/n8n', () => {
	let testDir: BinTestDir;
	let preload: string;

	beforeAll(() => {
		testDir = createBinTestDir('n8n-bin-');
		// Reports whether Object.prototype is locked when the command is about to load, then stops.
		preload = testDir.writeFile(
			'report-prototype.cjs',
			`const Module = require('module');
const { writeSync } = require('fs');
const load = Module._load;
Module._load = function (request, ...rest) {
	if (request.includes('command-registry')) {
		const state = { extensible: Object.isExtensible(Object.prototype) };
		writeSync(1, 'prototype-state:' + JSON.stringify(state) + '\\n');
		process.exit(0);
	}
	return load.call(this, request, ...rest);
};`,
		);
	});

	afterAll(() => {
		testDir.remove();
	});

	const prototypeStateAtCommandLoad = (env: Record<string, string> = {}) => {
		const { stdout, stderr } = testDir.run(['start'], { preload, env });
		return { state: readMarker(stdout, 'prototype-state:'), stderr };
	};

	it('locks Object.prototype before the command loads', () => {
		const { state, stderr } = prototypeStateAtCommandLoad();
		expect(state, stderr).toEqual({ extensible: false });
	});

	it('leaves Object.prototype unchanged when prototype hardening is turned off', () => {
		const { state, stderr } = prototypeStateAtCommandLoad({
			N8N_INSECURE_DISABLE_PROTOTYPE_HARDENING: 'true',
		});
		expect(state, stderr).toEqual({ extensible: true });
	});
});
