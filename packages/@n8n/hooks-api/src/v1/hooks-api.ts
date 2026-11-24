import type { WorkflowHooksV1 } from './hooks';
import type { HttpApiV1 } from './http';
import type { OwnershipApiV1 } from './ownership';
import type { WorkflowsApiV1 } from './workflows';

export type InstanceTypeV1 = 'main' | 'webhook' | 'worker';

export interface HooksApiV1 {
	readonly version: 1;

	instance: {
		type: InstanceTypeV1;
		n8nVersion: string;
	};

	ownership: OwnershipApiV1;
	workflows: WorkflowsApiV1;
	/** Not available on workers. */
	http?: HttpApiV1;

	/** Registrars for callbacks from n8n into the extension. */
	hooks: {
		workflow: WorkflowHooksV1;
	};
}
