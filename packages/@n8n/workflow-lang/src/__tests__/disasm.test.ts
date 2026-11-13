import { decodeModule, disassemble } from '../compiler/decode.ts';
import { corpusCase } from './helpers.ts';

describe('golden disassembly', () => {
	it.each(['01-order-approval', '04-try-finally', '08-promise-all-map', '09-closures'])(
		'%s',
		async (name) => {
			const text = disassemble(decodeModule(corpusCase(name).module));
			await expect(text).toMatchFileSnapshot(`__snapshots__/${name}.disasm.txt`);
		},
	);
});
