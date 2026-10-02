import type { CodeScope, ItemScope } from '../contexts';
import { codeScopeGlobals, type itemScopeGlobals } from '../globals';

describe('scope globals', () => {
	it('names every member of each scope once', () => {
		expectTypeOf<(typeof itemScopeGlobals)[number]>().toEqualTypeOf<keyof ItemScope<unknown, {}>>();
		expectTypeOf<(typeof codeScopeGlobals)[number]>().toEqualTypeOf<keyof CodeScope<unknown, {}>>();
		expect(new Set(codeScopeGlobals).size).toBe(codeScopeGlobals.length);
	});
});
