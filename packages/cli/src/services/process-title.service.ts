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

		const label = isMultiMain ? (isLeader ? 'leader' : 'follower') : instanceType;
		// In a container the hostname already identifies the process.
		if (isDocker) {
			process.title = `n8n ${label}`;
			return;
		}

		// `hostId` is `<instanceType>-<id>`, see `InstanceSettings`.
		const id = hostId.slice(instanceType.length + 1);
		process.title = `n8n ${label}-${id}`;
	}
}
