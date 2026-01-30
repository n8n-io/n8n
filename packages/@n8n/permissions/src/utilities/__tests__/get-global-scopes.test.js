'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const role_maps_ee_1 = require('../../roles/role-maps.ee');
const get_global_scopes_ee_1 = require('../get-global-scopes.ee');
const utils_1 = require('./utils');
describe('getGlobalScopes', () => {
	test.each(['global:owner', 'global:admin', 'global:member'])(
		'should return correct scopes for %s',
		(role) => {
			const scopes = (0, get_global_scopes_ee_1.getGlobalScopes)(
				(0, utils_1.createAuthPrincipal)(role),
			);
			expect(scopes).toEqual(role_maps_ee_1.GLOBAL_SCOPE_MAP[role]);
		},
	);
	test('should return empty array for non-existent role', () => {
		const scopes = (0, get_global_scopes_ee_1.getGlobalScopes)(
			(0, utils_1.createAuthPrincipal)('non:existent'),
		);
		expect(scopes).toEqual([]);
	});
});
//# sourceMappingURL=get-global-scopes.test.js.map
