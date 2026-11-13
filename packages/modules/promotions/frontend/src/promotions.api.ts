import type {
	ApplyPackageResultDto,
	ApplySelectionDto,
	ContinueApplySelectionDto,
	PromotePackageResultDto,
	PromoteSelectionRequestDto,
	PromotionDirection,
	PromotionPreview,
	PromotionResourceDetails,
	PromotionResourceDetailsRequestDto,
	PromotionReviewChanges,
	PromotionReviewDetailsRequestDto,
} from '@n8n/api-types';
import type { IRestApiContext, PublicApiContext } from '@n8n/rest-api-client';
import { makePublicApiRequest, makeRestApiRequest } from '@n8n/rest-api-client';

export async function getPromotionPreview(
	context: PublicApiContext,
	projectId: string,
	direction: PromotionDirection,
): Promise<PromotionPreview> {
	return await makePublicApiRequest(
		context,
		'GET',
		`/promotions/projects/${projectId}/changes/${direction}`,
	);
}

export async function getPromotionResourceDetails(
	context: PublicApiContext,
	projectId: string,
	direction: PromotionDirection,
	payload: PromotionResourceDetailsRequestDto,
): Promise<PromotionResourceDetails> {
	return await makePublicApiRequest(
		context,
		'POST',
		`/promotions/projects/${projectId}/changes/${direction}/details`,
		payload,
	);
}

export async function getPromotionReviewChanges(
	context: IRestApiContext,
	reviewId: string,
): Promise<PromotionReviewChanges> {
	return await makeRestApiRequest(context, 'GET', `/promotions/reviews/${reviewId}/changes`);
}

export async function getPromotionReviewDetails(
	context: IRestApiContext,
	reviewId: string,
	payload: PromotionReviewDetailsRequestDto,
): Promise<PromotionResourceDetails> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/promotions/reviews/${reviewId}/changes/details`,
		payload,
	);
}

export async function promoteProjectSelection(
	context: PublicApiContext,
	projectId: string,
	payload: PromoteSelectionRequestDto,
): Promise<PromotePackageResultDto> {
	return await makePublicApiRequest(
		context,
		'POST',
		`/promotions/projects/${projectId}/promote`,
		payload,
	);
}

/** Applies only the chosen workflows into the destination project. */
export async function applyProjectSelection(
	context: PublicApiContext,
	projectId: string,
	payload: ApplySelectionDto,
): Promise<ApplyPackageResultDto> {
	return await makePublicApiRequest(
		context,
		'POST',
		`/promotions/projects/${projectId}/apply`,
		payload,
	);
}

/** Resumes a selective apply that paused on unresolved bindings, once they are created. */
export async function continueApplyProjectSelection(
	context: PublicApiContext,
	projectId: string,
	payload: ContinueApplySelectionDto,
): Promise<ApplyPackageResultDto> {
	return await makePublicApiRequest(
		context,
		'POST',
		`/promotions/projects/${projectId}/apply/continue`,
		payload,
	);
}
