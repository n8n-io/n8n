import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'type-availability-policies' })
export class TypeAvailabilityPoliciesModule implements ModuleInterface {
	async init() {
		// Side-effecting import: registers the controller's routes via `@RestController`.
		await import('./type-availability-policy-instance.controller.js');
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
