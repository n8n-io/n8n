import { OnLeaderStepdown, OnLeaderTakeover } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

/** Sets the OS process name. */
@Service()
export class ProcessTitleService {
	constructor(private readonly instanceSettings: InstanceSettings) {}

	@OnLeaderTakeover()
	@OnLeaderStepdown()
	update() {
		process.title = this.toTitle();
	}

	private toTitle() {
		const { instanceType, instanceRole, hostId, isDocker } = this.instanceSettings;
		// In a container the hostname already identifies the process.
		const name = isDocker ? instanceType : hostId;
		return instanceRole === 'unset' ? `n8n ${name}` : `n8n ${instanceRole} ${name}`;
	}
}
