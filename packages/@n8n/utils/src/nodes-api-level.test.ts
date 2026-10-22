import { formatNodesApiLevel, parseNodesApiLevel } from './nodes-api-level';

describe('parseNodesApiLevel', () => {
	it.each([
		['3.1', { major: 3, minor: 1 }],
		['3.0', { major: 3, minor: 0 }],
		['3', { major: 3, minor: 0 }],
		['3.10', { major: 3, minor: 10 }],
	])('parses the string %p as %p', (value, expected) => {
		expect(parseNodesApiLevel(value)).toMatchObject(expected);
	});

	it.each([
		[1, { major: 1, minor: 0 }],
		[3, { major: 3, minor: 0 }],
	])('reads the integer %p as %p', (value, expected) => {
		expect(parseNodesApiLevel(value)).toMatchObject(expected);
	});

	it.each([
		0,
		-1,
		2.5,
		3.1,
		'0.0',
		'0.1',
		'01.1',
		'03',
		'3.01',
		'3.',
		'.1',
		' 3.2 ',
		'3.1.2',
		'v3',
		'',
		null,
		NaN,
		Infinity,
		true,
		{},
	])('rejects %p', (value) => {
		expect(parseNodesApiLevel(value)).toBeNull();
	});

	it.each([2 ** 53, '9007199254740992', '1.9007199254740992'])(
		'rejects the level %p above the safe integer range',
		(value) => {
			expect(parseNodesApiLevel(value)).toBeNull();
		},
	);
});

describe('formatNodesApiLevel', () => {
	it('writes major and minor', () => {
		expect(formatNodesApiLevel(parseNodesApiLevel('3.0')!)).toBe('3.0');
		expect(formatNodesApiLevel(parseNodesApiLevel('3.10')!)).toBe('3.10');
	});
});
