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
		const { instanceType, hostId, isDocker, isMultiMain, isLeader } = this.instanceSettings;
		// A single main and one-off commands keep `n8n <command>` from `bin/n8n`.
		if (instanceType === 'main' && !isMultiMain) return;

		const role = isMultiMain ? (isLeader ? 'leader' : 'follower') : undefined;
		// In a container the hostname already identifies the process.
		const name = isDocker ? instanceType : hostId;
		process.title = ['n8n', role, name].filter(Boolean).join(' ');
	}
}
