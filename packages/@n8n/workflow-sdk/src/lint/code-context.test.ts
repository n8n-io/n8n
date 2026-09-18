import { getStaticCodePrefix } from './code-context';

describe('getStaticCodePrefix', () => {
	const prefix = 'const customer = $input.first().json[0];';
	const source = prefix + '\nconst name = customer.nickname;\nreturn [{ json: { name } }];';
	const offsets = [source.indexOf('$input')];

	it('preserves diagnostic context when a later expression changes', async () => {
		const edited = source.replace('customer.nickname;', 'customer.nickname || customer.full_name;');
		expect(await getStaticCodePrefix(edited, offsets)).toBe(
			await getStaticCodePrefix(source, offsets),
		);
	});

	it('includes the whole statement and bindings that can affect it', async () => {
		const original = await getStaticCodePrefix(source, offsets);
		expect(await getStaticCodePrefix(source.replace('json[0]', 'json[1]'), offsets)).not.toBe(
			original,
		);
		expect(await getStaticCodePrefix(source + '\nconst $input = {};', offsets)).not.toBe(original);
	});

	it('allows a new binding that is not referenced by the diagnostic context', async () => {
		const edited =
			prefix +
			'\nconst greetingName = customer.nickname || customer.full_name;\nreturn [{ json: { name: greetingName } }];';
		expect(await getStaticCodePrefix(edited, offsets)).toBe(
			await getStaticCodePrefix(source, offsets),
		);
	});

	it('ignores comments and formatting in unchanged statements', async () => {
		const edited =
			'// Preserve the existing read.\n' + source.replace('const customer =', 'const customer=');
		expect(await getStaticCodePrefix(edited, [edited.indexOf('$input')])).toBe(
			await getStaticCodePrefix(source, offsets),
		);
	});

	it('supports literal values that JSON does not serialize directly', async () => {
		const withBigInt = 'const limit = 10n;\n' + source;
		const context = await getStaticCodePrefix(withBigInt, [withBigInt.indexOf('$input')]);
		expect(context).toContain('"value":"10"');
		const changed = withBigInt.replace('10n', '11n');
		const changedContext = await getStaticCodePrefix(changed, [changed.indexOf('$input')]);
		expect(changedContext).toContain('"value":"11"');
		expect(changedContext).not.toBe(context);
	});

	it.each(['row => row.name', 'function (row) { return row.name; }'])(
		'preserves context for an unchanged callback: %s',
		async (callback) => {
			const original =
				`const rows = $input.first().json.map(${callback});\n` +
				'const label = "Hello";\nreturn [{ json: { rows, label } }];';
			const context = await getStaticCodePrefix(original, [original.indexOf('$input')]);
			expect(context).toBeDefined();
			const edited = original.replace('"Hello"', '"Hi"');
			expect(await getStaticCodePrefix(edited, [edited.indexOf('$input')])).toBe(context);
			const changedCallback = original.replace('row.name', 'row.full_name');
			expect(
				await getStaticCodePrefix(changedCallback, [changedCallback.indexOf('$input')]),
			).not.toBe(context);
		},
	);

	it('includes bindings used by a captured callback', async () => {
		const original =
			'const field = "name";\nconst rows = $input.first().json.map(row => row[field]);';
		const context = await getStaticCodePrefix(original, [original.indexOf('$input')]);
		expect(context).toBeDefined();
		const edited = original.replace('"name"', '"full_name"');
		expect(await getStaticCodePrefix(edited, [edited.indexOf('$input')])).not.toBe(context);
	});

	it.each([
		'const rows = values.map(() => $input.first().json[0]);',
		'const rows = values.map(function () { return $input.first().json[0]; });',
		'const rows = $input.first().json.map(async row => row.name);',
		'const rows = $input.first().json.map(function* (row) { return row.name; });',
		'const rows = $input.first().json.map(async row => await row.name);',
	])('does not compare a read with deferred execution: %s', async (code) => {
		expect(await getStaticCodePrefix(code, [code.indexOf('$input')])).toBeUndefined();
	});

	it.each([
		'const later = () => customer;',
		'function later() { return customer; }',
		'const later = async () => customer;',
		'const later = await Promise.resolve(customer);',
		'let later = customer;',
		'eval("customer");',
		'var later = customer;',
		'if (customer) return [];',
		'const { nickname } = customer;',
	])('does not provide a partial comparison for %s', async (suffix) => {
		expect(await getStaticCodePrefix(source + '\n' + suffix, offsets)).toBeUndefined();
	});

	it('requires valid syntax and a diagnostic inside a statement', async () => {
		expect(await getStaticCodePrefix('const = ;', [0])).toBeUndefined();
		expect(await getStaticCodePrefix(source, [])).toBeUndefined();
		expect(await getStaticCodePrefix(source, [source.length + 1])).toBeUndefined();
	});
});
