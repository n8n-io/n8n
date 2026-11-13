import { createHash } from 'node:crypto';

import { decodeModule } from '../compiler/decode.ts';
import { compile } from '../compiler/index.ts';
import { encodeModule } from '../compiler/module.ts';
import { runReference } from '../reference/runner.ts';
import { runModule } from '../testing/vm.ts';
import { corpusCases } from './helpers.ts';

const cases = corpusCases();

describe('corpus', () => {
	it('has at least 20 workflows', () => {
		expect(cases.length).toBeGreaterThanOrEqual(20);
	});

	describe.each(cases)('$name', ({ source, fixture, expected, module }) => {
		it('the reference runner gives expected.json', async () => {
			expect(await runReference(source, fixture)).toEqual(expected);
		});

		it('compiles to the committed module.wfm', () => {
			const result = compile(source, { fileName: 'workflow.ts' });
			expect(result.diagnostics).toEqual([]);
			expect(result.module).toEqual(module);
		});

		it('decodes and re-encodes to the same bytes', () => {
			const decoded = decodeModule(module);
			expect(decoded.hashValid).toBe(true);
			expect(encodeModule(decoded)).toEqual(module);
		});

		it('the header hash is SHA-256 of the bytes after the header', () => {
			const hash = createHash('sha256').update(module.subarray(48)).digest('hex');
			expect(decodeModule(module).hash).toBe(hash);
		});

		it('the bytecode gives the same output as the reference runner', () => {
			const out = runModule(decodeModule(module), fixture);
			expect(JSON.stringify(out)).toBe(JSON.stringify(expected));
		});
	});
});
