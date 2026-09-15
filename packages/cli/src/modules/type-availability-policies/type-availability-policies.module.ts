import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

/**
 * The module-level `licenseFlag` skips `init()` on an unlicensed instance, so neither the
 * controllers nor the policy check are loaded there. Each route still carries `@Licensed` and
 * the check reads the license per decision: modules are initialized once at startup, so only
 * those cover a license that changes while running.
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

		// Side-effecting import: `@PolicyCheck` registers the check on class definition.
		await import('./node-type-policy.check.js');
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
