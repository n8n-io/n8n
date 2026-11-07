import type { WorkflowSuggestionBaseline } from '@n8n/api-types';
import { Container } from '@n8n/di';

import {
	SelfHealingResultRepository,
	type CreateSelfHealingResult,
} from '../../database/self-healing-result.repository';
import { createConfiguration } from './configuration';

export async function createResult(
	{
		workflowId,
		projectId,
		backgroundUserId,
	}: Pick<WorkflowSuggestionBaseline, 'workflowId' | 'projectId' | 'backgroundUserId'>,
	outcome: CreateSelfHealingResult['outcome'] = 'fix_ready',
) {
	const configuration = await createConfiguration(projectId, backgroundUserId);
	return await Container.get(SelfHealingResultRepository).createResult(
		{
			configurationId: configuration.id,
			workflowId,
			projectId,
			backgroundUserId,
			outcome,
			summary: 'Fix the workflow.',
			report: 'The workflow failed.',
			completedAt: new Date(),
			executionId: 'execution',
			usage: { credits: 1, turns: 2, durationSeconds: 30 },
		},
		{},
	);
}
