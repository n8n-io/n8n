import { describe, it, expect } from 'vitest';

import {
	INSTANCE_POLICY_VIEW,
	POLICIES_LANDING_VIEW,
	PROJECT_POLICY_VIEW,
} from './type-availability-policies.constants';
import { TypeAvailabilityPoliciesModule } from './type-availability-policies.module';

describe('TypeAvailabilityPoliciesModule', () => {
	it('keeps the id the backend module publishes in `activeModules`', () => {
		// A mismatch is silent: `isModuleActive` compares strings, so the module would
		// never report active. The twin is `packages/cli/src/modules/type-availability-policies`.
		expect(TypeAvailabilityPoliciesModule.id).toBe('type-availability-policies');
	});

	describe.each([
		['landing', POLICIES_LANDING_VIEW, 'security/node-and-credential-policies'],
		['instance policy', INSTANCE_POLICY_VIEW, 'security/node-and-credential-policies/instance'],
		[
			'project policy',
			PROJECT_POLICY_VIEW,
			'security/node-and-credential-policies/project/:teamProjectId',
		],
	])('%s route', (_label, name, path) => {
		const route = () => TypeAvailabilityPoliciesModule.routes?.find((r) => r.name === name);

		it('is a settings page, so the shell nests it under /settings', () => {
			expect(route()?.path).toBe(path);
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

		it('has no projectId param, so the shell does not load a current project', () => {
			expect(route()?.path.split('/')).not.toContain(':projectId');
		});
	});
});
