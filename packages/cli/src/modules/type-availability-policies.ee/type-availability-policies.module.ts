import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({
	name: 'type-availability-policies',
	licenseFlag: LICENSE_FEATURES.NODE_TYPE_POLICIES,
})
export class TypeAvailabilityPoliciesModule implements ModuleInterface {
	async init() {}

	async entities() {
		const { TypeAvailabilityPolicy } = await import(
			'./database/entities/type-availability-policy.entity.js'
		);
		const { TypeAvailabilityPolicyScope } = await import(
			'./database/entities/type-availability-policy-scope.entity.js'
		);
		const { TypeAvailabilityPolicyAttachment } = await import(
			'./database/entities/type-availability-policy-attachment.entity.js'
		);

		return [TypeAvailabilityPolicy, TypeAvailabilityPolicyScope, TypeAvailabilityPolicyAttachment];
	}
}
