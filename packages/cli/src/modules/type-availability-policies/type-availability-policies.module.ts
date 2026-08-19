import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'type-availability-policies' })
export class TypeAvailabilityPoliciesModule implements ModuleInterface {
	async init() {}
}
