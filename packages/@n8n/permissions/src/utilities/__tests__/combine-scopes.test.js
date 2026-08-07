'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const combine_scopes_ee_1 = require('../combine-scopes.ee');
describe('combineScopes', () => {
	describe('basic scope combining', () => {
		test.each([
			['single level', { global: ['workflow:read'] }, 1],
			[
				'multiple levels',
				{
					global: ['user:list'],
					project: ['workflow:read'],
				},
				2,
			],
			[
				'duplicates',
				{
					global: ['workflow:read'],
					project: ['workflow:read'],
				},
				1,
			],
		])('%s', (_, input, expectedSize) => {
			expect((0, combine_scopes_ee_1.combineScopes)(input).size).toBe(expectedSize);
		});
	});
	describe('masking behavior', () => {
		test.each([
			[
				'filters project scopes',
				{ project: ['workflow:read', 'workflow:update'], global: [] },
				{ sharing: ['workflow:read'] },
				['workflow:read'],
			],
			[
				'filters resource scopes',
				{ resource: ['credential:read', 'credential:update'], global: [] },
				{ sharing: ['credential:read'] },
				['credential:read'],
			],
			[
				'ignores global scopes',
				{ global: ['user:list'], project: ['workflow:read'] },
				{ sharing: [] },
				['user:list'],
			],
			['handles undefined masks', { global: ['user:list'] }, undefined, ['user:list']],
			[
				'handles empty resource scopes',
				{ resource: [], global: ['user:list'] },
				{ sharing: ['credential:read'] },
				['user:list'],
			],
		])('%s', (_, scopes, masks, expected) => {
			const result = (0, combine_scopes_ee_1.combineScopes)(scopes, masks);
			expect(result.size).toBe(expected.length);
			expected.forEach((scope) => expect(result.has(scope)).toBe(true));
		});
	});
});
//# sourceMappingURL=combine-scopes.test.js.map
