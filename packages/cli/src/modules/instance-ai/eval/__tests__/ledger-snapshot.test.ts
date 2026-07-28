import { snapshotLedgerBody } from '../ledger-snapshot';

describe('snapshotLedgerBody', () => {
	it('detaches the ledger entry from later in-place mutations by node code', () => {
		const served = { output: [{ content: [{ type: 'output_text', text: '{"a":1}' }] }] };
		const snapshot = snapshotLedgerBody(served) as typeof served;

		// e.g. the OpenAI node's json_schema output mode parses text in place
		served.output[0].content[0].text = { a: 1 } as never;

		expect(snapshot.output[0].content[0].text).toBe('{"a":1}');
	});

	it('copies Buffers so a later write to the served bytes leaves the ledger intact', () => {
		const served = Buffer.from('original');
		const snapshot = snapshotLedgerBody(served) as Buffer;

		// `callEvalMockHandler` hands this same Buffer to node code.
		served.write('MUTATED!');

		expect(snapshot).not.toBe(served);
		expect(snapshot.toString()).toBe('original');
		expect(served.toString()).toBe('MUTATED!');
	});

	it('passes nullish bodies through', () => {
		expect(snapshotLedgerBody(undefined)).toBeUndefined();
		expect(snapshotLedgerBody(null)).toBeNull();
	});

	it('detaches circular bodies without throwing', () => {
		const circular: Record<string, unknown> = { tag: 'original' };
		circular.self = circular;
		const snapshot = snapshotLedgerBody(circular) as Record<string, unknown>;
		circular.tag = 'mutated';
		expect(snapshot).not.toBe(circular);
		expect(snapshot.tag).toBe('original');
	});
});
