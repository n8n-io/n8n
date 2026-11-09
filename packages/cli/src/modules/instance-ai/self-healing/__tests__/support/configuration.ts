import { TransactionRunner, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { IMPLICIT_TEAM_PROJECT_MEMBER_ROLE_SLUGS } from '@n8n/permissions';
import { In } from '@n8n/typeorm';
import { onTestFinished } from 'vitest';

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

/**
 * Disable instance owners and admins until the test finishes. They are implicit members of
 * every team project.
 */
export async function disableInstanceAdmins() {
	const users = Container.get(UserRepository);
	const admins = await users.findBy({
		disabled: false,
		role: { slug: In(IMPLICIT_TEAM_PROJECT_MEMBER_ROLE_SLUGS) },
	});
	if (admins.length === 0) return;

	const ids = admins.map(({ id }) => id);
	await users.update({ id: In(ids) }, { disabled: true });
	onTestFinished(async () => {
		await users.update({ id: In(ids) }, { disabled: false });
	});
}
