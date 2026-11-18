import type { DeterminismSummaryDto } from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { GeneratedFromSourceType } from 'n8n-workflow';

export type DeterminismSourceRef = {
	projectId: string;
	sourceType: GeneratedFromSourceType;
	sourceId: string;
};

const sourcePath = ({ projectId, sourceType, sourceId }: DeterminismSourceRef) =>
	`/projects/${projectId}/determinism/${sourceType}/${sourceId}`;

export async function getDeterminismSummary(
	context: IRestApiContext,
	source: DeterminismSourceRef,
): Promise<DeterminismSummaryDto> {
	return await makeRestApiRequest(context, 'GET', sourcePath(source));
}

export async function dismissDeterminismSuggestion(
	context: IRestApiContext,
	source: DeterminismSourceRef,
): Promise<void> {
	await makeRestApiRequest(context, 'POST', `${sourcePath(source)}/dismiss`);
}
