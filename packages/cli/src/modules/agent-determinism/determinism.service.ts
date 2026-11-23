import type {
	DeterminismSuggestion,
	DeterminismSuggestionsDto,
	DeterminismSummaryDto,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import type { GeneratedFromSourceType } from 'n8n-workflow';

import {
	MIN_GAIN_POINTS,
	MIN_HOLDOUT_RUNS,
	MIN_MATCH_RATE,
	MIN_RUNS_FOR_ANALYSIS,
} from './agent-determinism.constants';
import {
	DeterminismSourceRepository,
	type DeterminismSourceRow,
} from './database/determinism-source.repository';

function toSuggestion(row: DeterminismSourceRow): DeterminismSuggestion | null {
	const { result, draftWorkflowId } = row;
	const isCurrent = row.analyzedVersionHash === row.versionHash;
	// The bar is checked when shown, so changing it needs no new analysis.
	const passes =
		result !== null &&
		result !== undefined &&
		result.totalRuns >= MIN_RUNS_FOR_ANALYSIS &&
		result.holdoutRuns >= MIN_HOLDOUT_RUNS &&
		result.matchRate >= MIN_MATCH_RATE &&
		result.gainPoints >= MIN_GAIN_POINTS;
	if (!passes || !draftWorkflowId || row.dismissedAt || !isCurrent) return null;

	return {
		draftWorkflowId,
		gainPoints: result.gainPoints,
		matchRate: result.matchRate,
		holdoutRuns: result.holdoutRuns,
		trafficShare: result.clusterTrafficShare,
		tokenDelta: result.tokenDelta,
	};
}

@Service()
export class DeterminismService {
	constructor(private readonly sourceRepository: DeterminismSourceRepository) {}

	async getSummary(
		projectId: string,
		sourceType: GeneratedFromSourceType,
		sourceId: string,
	): Promise<DeterminismSummaryDto> {
		const row = await this.sourceRepository.findBySource(sourceType, sourceId);
		if (!row || row.projectId !== projectId) return { suggestion: null, status: null };

		return { suggestion: toSuggestion(row), status: row.analysisStatus };
	}

	async listSuggestions(
		projectId: string,
		sourceType: GeneratedFromSourceType,
	): Promise<DeterminismSuggestionsDto> {
		const suggestions: DeterminismSuggestionsDto['suggestions'] = {};
		for (const row of await this.sourceRepository.findByProject(projectId, sourceType)) {
			const suggestion = toSuggestion(row);
			if (suggestion) suggestions[row.sourceId] = suggestion;
		}
		return { suggestions };
	}

	async dismiss(projectId: string, sourceType: GeneratedFromSourceType, sourceId: string) {
		const row = await this.sourceRepository.findBySource(sourceType, sourceId);
		if (!row || row.projectId !== projectId) throw new NotFoundError('No suggestion found');
		await this.sourceRepository.dismiss(sourceType, sourceId);
	}
}
