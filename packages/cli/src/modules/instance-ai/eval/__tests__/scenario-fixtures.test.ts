import { globMatch, resolveScenarioFixture, type ScenarioMockFixture } from '../scenario-fixtures';

function fixture(overrides: Partial<ScenarioMockFixture> = {}): ScenarioMockFixture {
	return {
		match: {},
		contentType: 'application/pdf',
		filename: 'doc.pdf',
		bytes: Buffer.from('content'),
		...overrides,
	};
}

describe('globMatch', () => {
	it('matches literal strings', () => {
		expect(globMatch('/foo/bar', '/foo/bar')).toBe(true);
		expect(globMatch('/foo/bar', '/foo/baz')).toBe(false);
	});

	it('uses * as a path-segment wildcard (does not cross /)', () => {
		expect(globMatch('/foo/*', '/foo/bar')).toBe(true);
		expect(globMatch('/foo/*', '/foo/bar/baz')).toBe(false);
	});

	it('uses ** as a cross-segment wildcard', () => {
		expect(globMatch('/foo/**', '/foo/bar')).toBe(true);
		expect(globMatch('/foo/**', '/foo/bar/baz')).toBe(true);
	});

	it('uses ? as exactly one char (not crossing /)', () => {
		expect(globMatch('/file/?', '/file/a')).toBe(true);
		expect(globMatch('/file/?', '/file/ab')).toBe(false);
		expect(globMatch('/file/?', '/file//')).toBe(false);
	});

	it('escapes regex metachars in the pattern (. + $ etc.)', () => {
		expect(globMatch('/path.with.dots', '/path.with.dots')).toBe(true);
		expect(globMatch('/path.with.dots', '/pathXwithXdots')).toBe(false);
		expect(globMatch('/v1+beta', '/v1+beta')).toBe(true);
		expect(globMatch('/v1+beta', '/v1beta')).toBe(false);
	});
});

describe('resolveScenarioFixture', () => {
	const baseRequest = { nodeName: 'Telegram1', url: 'https://api.example.com/x', method: 'GET' };

	it('returns undefined when no fixtures are provided', () => {
		expect(resolveScenarioFixture(undefined, baseRequest)).toBeUndefined();
		expect(resolveScenarioFixture([], baseRequest)).toBeUndefined();
	});

	it('returns the first fixture whose nodeName matches', () => {
		const f = fixture({ match: { nodeName: 'Telegram1' } });
		expect(resolveScenarioFixture([f], baseRequest)).toBe(f);
	});

	it('returns undefined when nodeName does not match', () => {
		const f = fixture({ match: { nodeName: 'OtherNode' } });
		expect(resolveScenarioFixture([f], baseRequest)).toBeUndefined();
	});

	it('matches URL globs', () => {
		const f = fixture({ match: { url: 'https://api.example.com/**' } });
		expect(resolveScenarioFixture([f], baseRequest)).toBe(f);
	});

	it('matches method case-insensitively', () => {
		const f = fixture({ match: { method: 'get' } });
		expect(resolveScenarioFixture([f], baseRequest)).toBe(f);
	});

	it('ANDs nodeName + url + method together', () => {
		const f = fixture({
			match: { nodeName: 'Telegram1', url: '**/x', method: 'GET' },
		});
		expect(resolveScenarioFixture([f], baseRequest)).toBe(f);
		expect(resolveScenarioFixture([f], { ...baseRequest, method: 'POST' })).toBeUndefined();
	});

	it('uses array order for precedence (earlier wins)', () => {
		const first = fixture({ match: { nodeName: 'Telegram1' }, filename: 'first.pdf' });
		const second = fixture({ match: { nodeName: 'Telegram1' }, filename: 'second.pdf' });
		expect(resolveScenarioFixture([first, second], baseRequest)).toBe(first);
	});

	it('skips non-matching fixtures and returns the first that matches', () => {
		const wrong = fixture({ match: { nodeName: 'NoSuch' }, filename: 'wrong.pdf' });
		const right = fixture({ match: { nodeName: 'Telegram1' }, filename: 'right.pdf' });
		expect(resolveScenarioFixture([wrong, right], baseRequest)).toBe(right);
	});

	it('treats an empty match (no fields) as a wildcard catch-all', () => {
		const f = fixture({ match: {} });
		expect(resolveScenarioFixture([f], baseRequest)).toBe(f);
	});
});
