import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';

import { SelfHealingConfiguration } from '../../database/self-healing-configuration.entity';
import { SelfHealingConfigurationRepository } from '../../database/self-healing-configuration.repository';
import { SelfHealingConfigurationReviewer } from '../../database/self-healing-configuration-reviewer.entity';

export async function createConfiguration(projectId: string, userId: string) {
	const repository = Container.get(SelfHealingConfigurationRepository);
	return await Container.get(TransactionRunner).run({}, async (ctx) => {
		const configuration = Object.assign(new SelfHealingConfiguration(), {
			projectId,
			scope: 'all' as const,
			enabled: true,
			enabledById: userId,
		});
		await repository.saveConfiguration(configuration, ctx);
		await repository.replaceSelections(
			configuration,
			{ workflowIds: [], reviewerIds: [userId] },
			ctx,
		);
		return configuration;
	});
}

export async function addReviewer(configurationId: number, userId: string) {
	const repository = Container.get(SelfHealingConfigurationRepository);
	await repository.manager.insert(SelfHealingConfigurationReviewer, { configurationId, userId });
}
