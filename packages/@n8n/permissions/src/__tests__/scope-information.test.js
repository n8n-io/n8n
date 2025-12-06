'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const scope_information_1 = require('@/scope-information');
describe('Scope Information', () => {
	it('ensure scopes are defined correctly', () => {
		expect(scope_information_1.ALL_SCOPES).toMatchSnapshot();
	});
});
//# sourceMappingURL=scope-information.test.js.map
