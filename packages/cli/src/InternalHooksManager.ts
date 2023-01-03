import { INodeTypes } from 'n8n-workflow';
import { InternalHooksClass } from '@/InternalHooks';
import { Telemetry } from '@/telemetry';

export class InternalHooksManager {
	private static internalHooksInstance: InternalHooksClass;

	static getInstance(): InternalHooksClass {
		if (this.internalHooksInstance) {
			return this.internalHooksInstance;
		}

		throw new Error('InternalHooks not initialized');
	}

	static async init(
		instanceId: string,
		versionCli: string,
		nodeTypes: INodeTypes,
	): Promise<InternalHooksClass> {
		if (!this.internalHooksInstance) {
			const telemetry = new Telemetry(instanceId, versionCli);
			await telemetry.init();
			this.internalHooksInstance = new InternalHooksClass(
				telemetry,
				instanceId,
				versionCli,
				nodeTypes,
			);
		}

		return this.internalHooksInstance;
	}
}
