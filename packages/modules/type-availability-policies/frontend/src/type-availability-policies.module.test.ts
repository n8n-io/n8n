import { describe, it, expect } from 'vitest';

import { INSTANCE_POLICY_VIEW } from './type-availability-policies.constants';
import { TypeAvailabilityPoliciesModule } from './type-availability-policies.module';

describe('TypeAvailabilityPoliciesModule', () => {
	it('keeps the id the backend module publishes in `activeModules`', () => {
		// A mismatch is silent: `isModuleActive` compares strings, so the module would
		// never report active. The twin is `packages/cli/src/modules/type-availability-policies`.
		expect(TypeAvailabilityPoliciesModule.id).toBe('type-availability-policies');
	});

	describe('instance policy route', () => {
		const route = () =>
			TypeAvailabilityPoliciesModule.routes?.find(({ name }) => name === INSTANCE_POLICY_VIEW);

		it('is a settings page, so the shell nests it under /settings', () => {
			expect(route()?.path).toBe('security/node-and-credential-policies/instance');
			expect(route()?.meta?.layout).toBe('settings');
			expect(route()?.meta?.telemetry?.pageCategory).toBe('settings');
		});

		it('opens for either global policy scope, and only while the module is active', () => {
			expect(route()?.meta?.middleware).toEqual(['authenticated', 'rbac', 'custom']);
			expect(route()?.meta?.middlewareOptions?.rbac).toEqual({
				scope: ['nodeTypePolicy:manage', 'credentialTypePolicy:manage'],
			});
		});

		it('has no projects segment, so the rbac middleware checks only global scopes', () => {
			expect(route()?.path.split('/')).not.toContain('projects');
		});
	});
});
