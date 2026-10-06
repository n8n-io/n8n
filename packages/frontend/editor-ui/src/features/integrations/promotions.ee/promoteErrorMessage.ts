import {
	parsePromotionsWorkflowsMovedCrossProjectMeta,
	type PromotableResource,
} from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import type { I18nClass } from '@n8n/i18n';

function resolveWorkflowTitles(workflowIds: string[], changes: PromotableResource[]): string {
	const nameById = new Map(changes.map((change) => [change.id, change.name]));
	return workflowIds.map((id) => nameById.get(id) ?? id).join(', ');
}

/** User-facing promote failure text; undefined falls back to the API error message. */
export function getPromoteErrorMessage(
	error: unknown,
	changes: PromotableResource[],
	i18n: I18nClass,
): string | undefined {
	if (!(error instanceof ResponseError)) {
		return undefined;
	}

	const meta = parsePromotionsWorkflowsMovedCrossProjectMeta(error.meta);
	if (!meta) {
		return undefined;
	}

	return i18n.baseText('promotions.modal.promoteError.workflowsMovedCrossProject', {
		interpolate: {
			workflows: resolveWorkflowTitles(meta.workflowIds, changes),
		},
	});
}
