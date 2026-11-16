import { defineFrontendModule } from '@n8n/frontend-module-sdk';

import {
	INSTANCE_POLICY_VIEW,
	POLICY_MANAGE_SCOPE,
	TYPE_AVAILABILITY_POLICIES_MODULE_ID,
} from './type-availability-policies.constants';

// typescript-eslint reads an SFC import as `any`, because only vue-tsc can type one.
// `pnpm turbo typecheck` is what checks this component for real.
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
const InstancePolicyView = async () => await import('./instance-policy/InstancePolicyView.vue');

/** Keep this file import-light: the shell runs every descriptor body before Pinia starts. */
export const TypeAvailabilityPoliciesModule = defineFrontendModule({
	id: TYPE_AVAILABILITY_POLICIES_MODULE_ID,
	name: 'Type Availability Policies',
	description: 'Reports which node types a project can use, and why a type is unavailable',
	icon: 'shield',
	routes: [
		{
			// No `projects` segment: the rbac middleware reads the segment after it as a project id.
			path: 'security/node-and-credential-policies/instance',
			name: INSTANCE_POLICY_VIEW,
			component: InstancePolicyView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'rbac', 'custom'],
				middlewareOptions: {
					rbac: {
						scope: [POLICY_MANAGE_SCOPE.node, POLICY_MANAGE_SCOPE.credential],
					},
				},
				telemetry: {
					pageCategory: 'settings',
					getProperties() {
						return { feature: 'node-and-credential-policies' };
					},
				},
			},
		},
	],
});
