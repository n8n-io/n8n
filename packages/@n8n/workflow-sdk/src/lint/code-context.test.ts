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
		expect(await getStaticCodePrefix(withBigInt, [withBigInt.indexOf('$input')])).toBeDefined();
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
