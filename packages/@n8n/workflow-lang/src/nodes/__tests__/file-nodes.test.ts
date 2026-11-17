/**
 * The library nodes Extract From File and Convert To File: the reference runner and the
 * bytecode VM give the same result, and the result is the output of the v1 node
 * (`moveTo.operation.ts`, `toText.operation.ts`, `toBinary.operation.ts`, `toJson.operation.ts`
 * and `createBinaryFromJson`).
 */
import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';

const RUNS_IN_HOST = '(no request to repeat: the fallback host runs the node)';

function source(type: string, parameters: Record<string, unknown>): string {
	return `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'files' })],
	async run(ctx, trigger) {
		return await ctx.node({
			name: 'Node',
			type: '${type}',
			typeVersion: 1.2,
			parameters: ${JSON.stringify(parameters)},
			items: [trigger.body],
		});
	},
});
`;
}

async function run(
	type: string,
	parameters: Record<string, unknown>,
	item: Record<string, unknown>,
	answers: unknown[] = [],
) {
	const text = source(type, parameters);
	const fixture = {
		trigger: { body: item, headers: {}, query: {} },
		now: 0,
		seed: 1,
		effects: { Node: answers },
	};
	const compiled = compile(text);
	expect(compiled.diagnostics).toEqual([]);
	const reference = await runReference(text, fixture);
	const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
	expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
	return reference;
}

const base64 = (text: string) => Buffer.from(text, 'utf8').toString('base64');
const file = (text: string) => ({ data: base64(text), mimeType: 'text/plain' });

describe('Extract From File library node', () => {
	const type = 'n8n-nodes-base.extractFromFile';
	const parameters = (operation: string, more: Record<string, unknown> = {}) => ({
		operation,
		binaryPropertyName: 'data',
		destinationKey: 'data',
		itemIndex: 0,
		...more,
	});

	it('gives the text of an inline ASCII file without a service call', async () => {
		const item = { a: 1, $binary: { data: file('line 1\nline 2\n'), other: file('x') } };
		const result = await run(type, parameters('text'), item);
		expect(result.status).toBe('ok');
		expect(result.result).toEqual([{ data: 'line 1\nline 2\n', $binary: { other: file('x') } }]);
		expect(result.effects).toEqual([]);
	});

	it('keeps the JSON and the binary data of the item when the option says so', async () => {
		const item = { a: 1, $binary: { data: file('x') } };
		const both = await run(type, parameters('xml', { options: { keepSource: 'both' } }), item);
		expect(both.result).toEqual([{ a: 1, data: 'x', $binary: { data: file('x') } }]);
		const json = await run(type, parameters('text', { options: { keepSource: 'json' } }), item);
		expect(json.result).toEqual([{ a: 1, data: 'x', $binary: {} }]);
		const binary = await run(type, parameters('text', { options: { keepSource: 'binary' } }), item);
		expect(binary.result).toEqual([{ data: 'x', $binary: { data: file('x') } }]);
	});

	it('parses a JSON file, and an empty file is an empty object', async () => {
		const parsed = await run(type, parameters('fromJson'), {
			$binary: { data: file('{"a":[1,2]}') },
		});
		expect(parsed.result).toEqual([{ data: { a: [1, 2] }, $binary: {} }]);
		const empty = await run(type, parameters('fromJson'), { $binary: { data: file('') } });
		expect(empty.result).toEqual([{ data: {}, $binary: {} }]);
	});

	it('gives the error of v1 for a file that is not JSON', async () => {
		const result = await run(type, parameters('fromJson'), { $binary: { data: file('hello') } });
		expect(result.status).toBe('error');
		expect(result.result).toMatchObject({
			message: "The file selected in 'Input Binary Field' is not in JSON format",
			description: "Try to change the operation or select a JSON file in 'Input Binary Field'",
		});
	});

	it('reads CSV in the bytecode VM as on the reference runner', async () => {
		const text = 'name,note,n\r\n"Ada, L.","say ""hi""\r\nthen go",1\r\n\r\nBob,,2\r\n';
		const csv = (options: Record<string, unknown>) => ({
			operation: 'csv',
			binaryPropertyName: 'data',
			itemIndex: 0,
			options,
		});
		const result = await run(type, csv({}), { $binary: { data: file(text) } });
		expect(result.result).toEqual([
			{ name: 'Ada, L.', note: 'say "hi"\r\nthen go', n: '1' },
			{ name: 'Bob', n: '2' },
		]);
		const rows = await run(type, csv({ headerRow: false, fromLine: 2, maxRowCount: 1 }), {
			$binary: { data: file('skip\na;b\nc;d\n') },
		});
		expect(rows.result).toEqual([{ row: { 0: 'a;b' } }]);
		const ragged = await run(type, csv({}), { $binary: { data: file('a,b\n1\n') } });
		expect(String((ragged.result as { message: string }).message)).toContain(RUNS_IN_HOST);
	});

	it('gives the base64 text of the file', async () => {
		const result = await run(type, parameters('binaryToPropery'), {
			$binary: { data: file('abc') },
		});
		expect(result.result).toEqual([{ data: base64('abc'), $binary: {} }]);
	});

	it('gives the errors of assertBinaryData', async () => {
		const none = await run(type, parameters('text', { itemIndex: 3 }), { a: 1 });
		expect(none.result).toMatchObject({
			message:
				"This operation expects the node's input data to contain a binary file 'data', but none was found [item 3]",
			description: 'Make sure that the previous node outputs a binary file',
		});
		const other = await run(type, parameters('text'), { $binary: { other: file('x') } });
		expect(other.result).toMatchObject({
			message: "The item has no binary field 'data' [item 0]",
			description:
				'Check that the parameter where you specified the input binary field name is correct, and that it matches a field in the binary input',
		});
	});

	it('reads a stored file and a file with other bytes through the binaryData service', async () => {
		const stored = {
			data: 'filesystem-v2',
			id: 'filesystem-v2:workflows/w/executions/1/binary_data/u',
		};
		const result = await run(type, parameters('text'), { $binary: { data: stored } }, [
			{ text: 'héllo' },
		]);
		expect(result.result).toEqual([{ data: 'héllo', $binary: {} }]);
		expect(result.effects[0]).toMatchObject({
			kind: 'service',
			args: {
				service: 'binaryData',
				op: 'read',
				args: { as: 'text', limit: 262144, id: stored.id },
			},
		});
		const inline = await run(
			type,
			parameters('text', { options: { encoding: 'utf8', stripBOM: false } }),
			{ $binary: { data: file('héllo') } },
			[{ text: 'héllo' }],
		);
		expect(inline.effects[0]).toMatchObject({
			args: { args: { data: base64('héllo'), encoding: 'utf8', stripBOM: false } },
		});
	});

	it('hands the node over to the host when the service has no exact form', async () => {
		const stored = {
			data: 'filesystem-v2',
			id: 'filesystem-v2:workflows/w/executions/1/binary_data/u',
		};
		const result = await run(type, parameters('text'), { $binary: { data: stored } }, [
			{ host: 'the file has more than 262144 bytes' },
		]);
		expect(result.status).toBe('error');
		expect(String((result.result as { message: string }).message)).toContain(RUNS_IN_HOST);
		const path = await run(type, parameters('text', { destinationKey: 'a.b' }), {
			$binary: { data: file('x') },
		});
		expect(String((path.result as { message: string }).message)).toContain(RUNS_IN_HOST);
	});
});

describe('Convert To File library node', () => {
	const type = 'n8n-nodes-base.convertToFile';
	const entry = { data: 'aGk=', mimeType: 'text/plain', fileName: 'file.txt' };

	it('stores the UTF-8 bytes of a text property', async () => {
		const result = await run(
			type,
			{ operation: 'toText', sourceProperty: 'text', binaryPropertyName: 'data', nodeVersion: 1.1 },
			{ text: 'héllo' },
			[{ entry }],
		);
		expect(result.result).toEqual([{ $binary: { data: entry } }]);
		expect(result.effects[0]).toMatchObject({
			args: {
				service: 'binaryData',
				op: 'store',
				args: { data: base64('héllo'), fileName: 'file.txt', mimeType: 'text/plain' },
			},
		});
	});

	it('adds a byte order mark, and writes an object as JSON', async () => {
		const result = await run(
			type,
			{
				operation: 'toText',
				sourceProperty: 'o',
				binaryPropertyName: 'f',
				options: { addBOM: true, encoding: 'utf8', fileName: 'a.txt' },
			},
			{ o: { a: 1 } },
			[{ entry }],
		);
		expect(result.result).toEqual([{ $binary: { f: entry } }]);
		expect(result.effects[0]).toMatchObject({
			args: {
				args: { data: base64('\uFEFF{"a":1}'), fileName: 'a.txt', mimeType: 'application/json' },
			},
		});
	});

	it('writes the JSON of each item, with the file name of v1 when the entry has none', async () => {
		const result = await run(
			type,
			{ operation: 'toJson', mode: 'each', binaryPropertyName: 'data', options: { format: true } },
			{ a: 1 },
			[{ entry: { data: 'e30=', mimeType: 'application/json', fileExtension: 'json' } }],
		);
		expect(result.result).toEqual([
			{
				$binary: {
					data: {
						data: 'e30=',
						mimeType: 'application/json',
						fileExtension: 'json',
						fileName: 'file.json',
					},
				},
			},
		]);
		expect(result.effects[0]).toMatchObject({
			args: { args: { data: base64('{\n  "a": 1\n}'), mimeType: 'application/json' } },
		});
	});

	it('sends base64 data as it is, and checks it in version 1.2', async () => {
		const parameters = {
			operation: 'toBinary',
			sourceProperty: 'b',
			binaryPropertyName: 'data',
			options: { mimeType: 'image/png' },
			nodeVersion: 1.2,
		};
		const good = await run(type, parameters, { b: ' aG k=\n' }, [{ entry }]);
		expect(good.effects[0]).toMatchObject({
			args: { args: { data: 'aGk=', mimeType: 'image/png' } },
		});
		const bad = await run(type, parameters, { b: 'a' });
		expect(bad.result).toMatchObject({
			message: 'The value in "b" is not valid Base64 data',
			description: 'Use Convert to Text File to write plain text to a file.',
		});
		const loose = await run(type, { ...parameters, nodeVersion: 1.1 }, { b: 'a!' }, [{ entry }]);
		expect(loose.effects[0]).toMatchObject({ args: { args: { data: 'a!' } } });
	});

	it('gives the error of v1 for a value that is not set', async () => {
		const result = await run(
			type,
			{ operation: 'toText', sourceProperty: 'missing', binaryPropertyName: 'data' },
			{ a: 1 },
		);
		expect(result.result).toMatchObject({ message: 'The value in "missing" is not set' });
	});

	it('hands the node over to the host for an encoding other than UTF-8', async () => {
		const result = await run(
			type,
			{
				operation: 'toText',
				sourceProperty: 'a',
				binaryPropertyName: 'data',
				options: { encoding: 'utf16le' },
			},
			{ a: 'x' },
		);
		expect(String((result.result as { message: string }).message)).toContain(RUNS_IN_HOST);
	});
});
