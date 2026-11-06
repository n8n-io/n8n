import { defineFrontendModule } from '@n8n/frontend-module-sdk';

import { TYPE_AVAILABILITY_POLICIES_MODULE_ID } from './type-availability-policies.constants';

/** Keep this file import-light: the shell runs every descriptor body before Pinia starts. */
export const TypeAvailabilityPoliciesModule = defineFrontendModule({
	id: TYPE_AVAILABILITY_POLICIES_MODULE_ID,
	name: 'Type Availability Policies',
	description: 'Reports which node types a project can use, and why a type is unavailable',
	icon: 'shield',
});
