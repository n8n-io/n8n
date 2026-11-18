import type { DeterminismSummaryDto } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import type { GeneratedFromSourceType } from 'n8n-workflow';

import { DeterminismSourceRepository } from './database/determinism-source.repository';

@Service()
export class DeterminismService {
	constructor(private readonly sourceRepository: DeterminismSourceRepository) {}

	async getSummary(
		projectId: string,
		sourceType: GeneratedFromSourceType,
		sourceId: string,
	): Promise<DeterminismSummaryDto> {
		const row = await this.sourceRepository.findBySource(sourceType, sourceId);
		if (!row || row.projectId !== projectId) return { suggestion: null };

		const { result, draftWorkflowId } = row;
		const isCurrent = row.analyzedVersionHash === row.versionHash;
		if (!result?.showCta || !draftWorkflowId || row.dismissedAt || !isCurrent) {
			return { suggestion: null };
		}

		return {
			suggestion: {
				draftWorkflowId,
				gainPoints: result.gainPoints,
				matchRate: result.matchRate,
				holdoutRuns: result.holdoutRuns,
				tokenDelta: result.tokenDelta,
			},
		};
	}

	async dismiss(projectId: string, sourceType: GeneratedFromSourceType, sourceId: string) {
		const row = await this.sourceRepository.findBySource(sourceType, sourceId);
		if (!row || row.projectId !== projectId) throw new NotFoundError('No suggestion found');
		await this.sourceRepository.dismiss(sourceType, sourceId);
	}
}
