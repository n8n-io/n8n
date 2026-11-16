import {
	parsePromotionsWorkflowsMovedCrossProjectMeta,
	type PromotionResource,
} from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import type { I18nClass } from '@n8n/i18n';

function resolveWorkflowTitles(workflowIds: string[], resources: PromotionResource[]): string {
	// Only workflows, so another resource with the same ID cannot supply the name.
	const nameById = new Map(
		resources.flatMap(({ type, id, name }) => (type === 'workflow' ? [[id, name] as const] : [])),
	);
	return workflowIds.map((id) => nameById.get(id) ?? id).join(', ');
}

/** User-facing promote failure text; undefined falls back to the API error message. */
export function getPromoteErrorMessage(
	error: unknown,
	resources: PromotionResource[],
	i18n: I18nClass,
): string | undefined {
	if (!(error instanceof ResponseError)) {
		return undefined;
	}

	const movedMeta = parsePromotionsWorkflowsMovedCrossProjectMeta(error.meta);
	if (movedMeta) {
		return i18n.baseText('promotions.operation.promoteError.workflowsMovedCrossProject', {
			interpolate: {
				workflows: resolveWorkflowTitles(movedMeta.workflowIds, resources),
			},
		});
	}

	return undefined;
}
