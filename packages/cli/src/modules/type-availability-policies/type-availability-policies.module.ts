import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

/**
 * The module-level `licenseFlag` skips `init()` on an unlicensed instance, so the controllers
 * are never loaded there. Each route still carries `@Licensed`: modules are initialized once
 * at startup, so only the per-route check covers a license that changes while running.
 */
@BackendModule({
	name: 'type-availability-policies',
	licenseFlag: LICENSE_FEATURES.NODE_TYPE_POLICIES,
})
export class TypeAvailabilityPoliciesModule implements ModuleInterface {
	async init() {
		// Side-effecting imports: register the controllers' routes via `@RestController`.
		await import('./type-availability-policy-instance.controller.js');
		await import('./type-availability-policy-project.controller.js');
		await import('./available-types.controller.js');
	}

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
