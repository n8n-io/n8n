import type { WorkflowSuggestionBaseline } from '@n8n/api-types';
import { Container } from '@n8n/di';

import { SelfHealingResultRepository } from '../../database/self-healing-result.repository';
import { createConfiguration } from './configuration';

export async function createResult({
	projectId,
	workflowId,
	backgroundUserId,
}: Pick<WorkflowSuggestionBaseline, 'projectId' | 'workflowId' | 'backgroundUserId'>) {
	const configuration = await createConfiguration(projectId, backgroundUserId);
	return await Container.get(SelfHealingResultRepository).createResult(
		{
			configurationId: configuration.id,
			projectId,
			workflowId,
			backgroundUserId,
			executionId: 'test-execution',
			outcome: 'fix_ready',
			summary: 'A workflow fix is ready.',
			report: 'Review the suggested workflow fix.',
			completedAt: new Date(),
			usage: { credits: null, turns: null, durationSeconds: null },
		},
		{},
	);
}
