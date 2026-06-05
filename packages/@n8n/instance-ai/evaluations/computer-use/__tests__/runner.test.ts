import { resolveInside } from '../runner';

describe('resolveInside', () => {
	const root = '/tmp/sandbox';

	it('accepts paths inside the root', () => {
		expect(resolveInside(root, 'foo.txt', 'sandbox path')).toBe('/tmp/sandbox/foo.txt');
		expect(resolveInside(root, 'sub/dir/file.json', 'sandbox path')).toBe(
			'/tmp/sandbox/sub/dir/file.json',
		);
	});

	it('accepts the root itself (empty candidate)', () => {
		expect(resolveInside(root, '', 'sandbox path')).toBe('/tmp/sandbox');
	});

	it('rejects parent traversal via ..', () => {
		expect(() => resolveInside(root, '../escape.txt', 'sandbox path')).toThrow(
			/escapes \/tmp\/sandbox/,
		);
	});

	it('rejects nested traversal that resolves outside root', () => {
		expect(() => resolveInside(root, 'sub/../../escape', 'sandbox path')).toThrow(/escapes/);
	});

	it('rejects absolute paths outside the root', () => {
		expect(() => resolveInside(root, '/etc/passwd', 'sandbox path')).toThrow(/escapes/);
	});

	it('uses the label in the error message', () => {
		expect(() => resolveInside(root, '../x', 'fixture path')).toThrow(/^fixture path/);
	});
});
