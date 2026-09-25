import { stringifyWorkspaceJson, withTrailingNewline } from '../workspace-file-content';

describe('withTrailingNewline', () => {
	it('appends a newline when missing', () => {
		expect(withTrailingNewline('hello')).toBe('hello\n');
	});

	it('preserves an existing trailing newline', () => {
		expect(withTrailingNewline('hello\n')).toBe('hello\n');
	});
});

describe('stringifyWorkspaceJson', () => {
	it('pretty-prints JSON with a trailing newline', () => {
		expect(stringifyWorkspaceJson({ schemaVersion: 1, contentHash: 'abc' })).toBe(
			'{\n  "schemaVersion": 1,\n  "contentHash": "abc"\n}\n',
		);
	});
});
