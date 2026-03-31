import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { OwnerInstanceSettingsLoaderStep } from './steps/owner.instance-settings-loader-step';

type StepResult = 'created' | 'skipped';

@Service()
export class InstanceSettingsLoaderService {
	constructor(
		private logger: Logger,
		private readonly ownerStep: OwnerInstanceSettingsLoaderStep,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	async init(): Promise<void> {
		await this.run('owner', async () => await this.ownerStep.run());
	}

	private async run(name: string, fn: () => Promise<StepResult>): Promise<void> {
		const result = await fn();
		this.logger.debug(`Instance settings loader step "${name}": ${result}`);
	}
}
