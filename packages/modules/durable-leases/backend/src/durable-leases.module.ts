import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'durable-leases', instanceTypes: ['main'] })
export class DurableLeasesModule implements ModuleInterface {}
