import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({
	name: 'execution-limits',
	licenseFlag: LICENSE_FEATURES.EXECUTION_LIMITS,
})
export class ExecutionLimitsModule implements ModuleInterface {}
