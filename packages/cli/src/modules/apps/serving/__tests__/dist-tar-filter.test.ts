import { createDistTarFilter } from '../dist-tar-filter';

const file = (size = 10) => ({ type: 'File', size });
const directory = () => ({ type: 'Directory', size: 0 });

describe('createDistTarFilter', () => {
	test('accepts plain files and directories under the root', () => {
		const filter = createDistTarFilter();

		expect(filter('./index.html', file())).toBe(true);
		expect(filter('assets/', directory())).toBe(true);
		expect(filter('assets/app.js', file())).toBe(true);
	});

	test('rejects absolute paths', () => {
		const filter = createDistTarFilter();

		expect(filter('/etc/passwd', file())).toBe(false);
		expect(filter('C:\\Windows\\win.ini', file())).toBe(false);
	});

	test('rejects any parent segment', () => {
		const filter = createDistTarFilter();

		expect(filter('../evil', file())).toBe(false);
		expect(filter('assets/../../evil', file())).toBe(false);
		expect(filter('assets\\..\\evil', file())).toBe(false);
	});

	test('rejects links and devices', () => {
		const filter = createDistTarFilter();

		expect(filter('link', { type: 'SymbolicLink', size: 0 })).toBe(false);
		expect(filter('hard', { type: 'Link', size: 0 })).toBe(false);
		expect(filter('dev', { type: 'CharacterDevice', size: 0 })).toBe(false);
		expect(filter('unknown', { size: 0 })).toBe(false);
	});

	test('rejects entries past the count limit', () => {
		const filter = createDistTarFilter({ maxEntries: 2, maxBytes: 1_000 });

		expect(filter('a', file())).toBe(true);
		expect(filter('b', file())).toBe(true);
		expect(filter('c', file())).toBe(false);
	});

	test('rejects entries that would push the unpacked size over the limit', () => {
		const filter = createDistTarFilter({ maxEntries: 10, maxBytes: 25 });

		expect(filter('a', file(10))).toBe(true);
		expect(filter('b', file(10))).toBe(true);
		expect(filter('c', file(10))).toBe(false);
		expect(filter('d', file(5))).toBe(true);
	});

	test('does not count a rejected entry towards the limits', () => {
		const filter = createDistTarFilter({ maxEntries: 1, maxBytes: 1_000 });

		expect(filter('../evil', file())).toBe(false);
		expect(filter('ok', file())).toBe(true);
	});
});
