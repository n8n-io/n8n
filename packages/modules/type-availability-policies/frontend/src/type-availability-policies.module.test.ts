import { TypeAvailabilityPoliciesModule } from './type-availability-policies.module';

describe('TypeAvailabilityPoliciesModule', () => {
	it('keeps the id the backend module publishes in `activeModules`', () => {
		// A mismatch is silent: `isModuleActive` compares strings, so the module would
		// never report active. The twin is `packages/cli/src/modules/type-availability-policies`.
		expect(TypeAvailabilityPoliciesModule.id).toBe('type-availability-policies');
	});
});
