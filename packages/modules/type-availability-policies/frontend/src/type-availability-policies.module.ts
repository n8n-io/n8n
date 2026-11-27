import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import type { RouteMeta } from 'vue-router';

import {
	INSTANCE_POLICY_VIEW,
	POLICIES_LANDING_VIEW,
	POLICY_MANAGE_SCOPE,
	PROJECT_POLICY_VIEW,
	TYPE_AVAILABILITY_POLICIES_MODULE_ID,
} from './type-availability-policies.constants';

// typescript-eslint reads an SFC import as `any`, because only vue-tsc can type one.
// `pnpm turbo typecheck` is what checks these components for real.
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
const PoliciesLandingView = async () => await import('./policies-landing/PoliciesLandingView.vue');
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
const InstancePolicyView = async () => await import('./instance-policy/InstancePolicyView.vue');
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
const ProjectPolicyView = async () => await import('./project-policy/ProjectPolicyView.vue');

const policyPageMeta = {
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
} satisfies RouteMeta;

/** Keep this file import-light: the shell runs every descriptor body before Pinia starts. */
export const TypeAvailabilityPoliciesModule = defineFrontendModule({
	id: TYPE_AVAILABILITY_POLICIES_MODULE_ID,
	name: 'Type Availability Policies',
	description: 'Reports which node types a project can use, and why a type is unavailable',
	icon: 'shield',
	// No `projects` segment in these paths: the rbac middleware reads the segment after it as a
	// project id. No `projectId` param either: the shell loads that project as the current one.
	routes: [
		{
			path: 'security/node-and-credential-policies',
			name: POLICIES_LANDING_VIEW,
			component: PoliciesLandingView,
			meta: policyPageMeta,
		},
		{
			path: 'security/node-and-credential-policies/instance',
			name: INSTANCE_POLICY_VIEW,
			component: InstancePolicyView,
			meta: policyPageMeta,
		},
		{
			path: 'security/node-and-credential-policies/project/:teamProjectId',
			name: PROJECT_POLICY_VIEW,
			component: ProjectPolicyView,
			meta: policyPageMeta,
		},
	],
});
