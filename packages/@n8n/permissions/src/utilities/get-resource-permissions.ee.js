'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getResourcePermissions = void 0;
const constants_ee_1 = require('../constants.ee');
const getResourcePermissions = (resourceScopes = []) =>
	Object.keys(constants_ee_1.RESOURCES).reduce(
		(permissions, key) => ({
			...permissions,
			[key]: resourceScopes.reduce((resourcePermissions, scope) => {
				const [prefix, suffix] = scope.split(':');
				if (prefix === key) {
					return {
						...resourcePermissions,
						[suffix]: true,
					};
				}
				return resourcePermissions;
			}, {}),
		}),
		{},
	);
exports.getResourcePermissions = getResourcePermissions;
//# sourceMappingURL=get-resource-permissions.ee.js.map
