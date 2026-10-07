import { resolveOperatorPromptVersion } from '../instance-ai.service';

describe('resolveOperatorPromptVersion', () => {
	it.each(['', '   ', undefined])('treats %p as no pin', (configured) => {
		// An empty string must not reach `resolvePromptProfile`: it would be
		// reported as a fallback from an unknown version instead of a clean default.
		expect(resolveOperatorPromptVersion(configured)).toBeUndefined();
	});

	it.each(['default@1', 'progressive@1', 'concise@1'])(
		'accepts published version %s',
		(version) => {
			expect(resolveOperatorPromptVersion(version)).toBe(version);
		},
	);

	it('trims surrounding whitespace', () => {
		expect(resolveOperatorPromptVersion('  concise@1\n')).toBe('concise@1');
	});

	it('throws on an unpublished version, so a typo fails the run instead of silently serving the default', () => {
		expect(() => resolveOperatorPromptVersion('concise@99')).toThrow(
			'Unknown Instance AI prompt version',
		);
	});
});
