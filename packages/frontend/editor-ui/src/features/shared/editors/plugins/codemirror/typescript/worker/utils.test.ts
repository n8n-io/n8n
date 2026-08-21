import { snippetFnPrefix, fnPrefix, prefixForContext, wrapInFunction } from './utils';

describe('typescript worker utils', () => {
	describe('wrapInFunction', () => {
		it('wraps Code node scripts with a return-type contract', () => {
			const wrapped = wrapInFunction('return items', 'runOnceForAllItems');
			expect(wrapped).toContain('@returns {N8nOutputItems}');
			expect(wrapped).toContain('return items');
			expect(wrapped.endsWith('\n})()')).toBe(true);
		});

		it('wraps snippets as a returned expression without a return-type contract', () => {
			const wrapped = wrapInFunction('(n) => n * 2', 'runOnceForEachItem', 'snippet');
			expect(wrapped).not.toContain('@returns');
			expect(wrapped).toContain('return (\n(n) => n * 2');
			expect(wrapped.endsWith('\n)})()')).toBe(true);
		});

		// Position mapping (editor <-> typescript) relies on this invariant
		it.each([
			['codeNode', 'return 1'],
			['snippet', '(n) => n'],
		] as const)('wrapped %s content starts with its prefix', (context, source) => {
			const mode = 'runOnceForEachItem';
			expect(wrapInFunction(source, mode, context).startsWith(prefixForContext(mode, context))).toBe(
				true,
			);
			expect(prefixForContext(mode, context)).toBe(
				context === 'snippet' ? snippetFnPrefix : fnPrefix(mode),
			);
		});
	});
});
