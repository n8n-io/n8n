/* eslint-disable import/no-cycle */
import { InternalHooksClass } from './InternalHooks';
import { Telemetry } from './telemetry';

export class InternalHooksManager {
	private static internalHooksInstance: InternalHooksClass;

	static getInstance(): InternalHooksClass {
		if (this.internalHooksInstance) {
			return this.internalHooksInstance;
		}

		throw new Error('InternalHooks not initialized');
	}

	static init(instanceId: string, versionCli: string): InternalHooksClass {
		if (!this.internalHooksInstance) {
			this.internalHooksInstance = new InternalHooksClass(
				new Telemetry(instanceId, versionCli),
				versionCli,
			);
		}

		return this.internalHooksInstance;
	}
}
