import type {
	ApplyEnvironmentSelectionRequestDto,
	ApplyPackageResultDto,
	ApplySelectionDto,
	ContinueApplySelectionDto,
	CreatePromotionOwnerRequestDto,
	PromoteEnvironmentSelectionRequestDto,
	PromoteSelectionRequestDto,
	PromoteSelectionResultDto,
	PromotionDirection,
	PromotionEnvironmentChanges,
	PromotionInstanceApplyPreview,
	PromotionOwnerRequestResult,
	PromotionPreview,
	PromotionProjectEnvironments,
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

/** The environments that serve a project. A project admin can read them without global scopes. */
export async function getPromotionProjectEnvironments(
	context: PublicApiContext,
	projectId: string,
): Promise<PromotionProjectEnvironments> {
	return await makePublicApiRequest(
		context,
		'GET',
		`/promotions/projects/${projectId}/environments`,
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

/**
 * The endpoints of the changes view of an environment, across projects. The paths are
 * provisional. Change them here only.
 */
const environmentPaths = {
	changes: (environmentId: string) => `/promotions/environments/${environmentId}/changes`,
	details: (environmentId: string) => `/promotions/environments/${environmentId}/changes/details`,
	promote: (environmentId: string) => `/promotions/environments/${environmentId}/promote-selection`,
	apply: (environmentId: string) => `/promotions/environments/${environmentId}/apply-selection`,
	continueApply: (environmentId: string) =>
		`/promotions/environments/${environmentId}/apply-selection/continue`,
};

/**
 * A server from before the changes view sends the Apply preview of the whole instance: the same
 * rows, without the list of projects and without a direction.
 */
export type EnvironmentChangesResponse = Omit<
	PromotionEnvironmentChanges,
	'direction' | 'projects'
> &
	Partial<Pick<PromotionEnvironmentChanges, 'direction' | 'projects'>>;

/**
 * The changes of every project of the environment that the user can access, for the direction
 * of the environment.
 */
export async function getPromotionEnvironmentChanges(
	context: PublicApiContext,
	environmentId: string,
): Promise<EnvironmentChangesResponse> {
	return await makePublicApiRequest(context, 'GET', environmentPaths.changes(environmentId));
}

export async function getPromotionEnvironmentDetails(
	context: PublicApiContext,
	environmentId: string,
	payload: PromotionResourceDetailsRequestDto,
): Promise<PromotionResourceDetails> {
	return await makePublicApiRequest(
		context,
		'POST',
		environmentPaths.details(environmentId),
		payload,
	);
}

/** Promotes a selection across projects. It writes one commit and opens at most one review. */
export async function promoteEnvironmentSelection(
	context: PublicApiContext,
	environmentId: string,
	payload: PromoteEnvironmentSelectionRequestDto,
): Promise<PromoteSelectionResultDto> {
	return await makePublicApiRequest(
		context,
		'POST',
		environmentPaths.promote(environmentId),
		payload,
	);
}

/** Applies a selection across projects. */
export async function applyEnvironmentSelection(
	context: PublicApiContext,
	environmentId: string,
	payload: ApplyEnvironmentSelectionRequestDto,
): Promise<ApplyPackageResultDto> {
	return await makePublicApiRequest(
		context,
		'POST',
		environmentPaths.apply(environmentId),
		payload,
	);
}

/** The same Apply, with the confirmation of its destructive changes. */
export async function continueApplyEnvironmentSelection(
	context: PublicApiContext,
	environmentId: string,
	payload: ApplyEnvironmentSelectionRequestDto,
): Promise<ApplyPackageResultDto> {
	return await makePublicApiRequest(
		context,
		'POST',
		environmentPaths.continueApply(environmentId),
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
): Promise<PromoteSelectionResultDto> {
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

/**
 * "Ask the owner": asks the owner of a dependency to promote or apply it. The environment gives
 * the operation. The answer never says anything about the owner.
 */
export async function createPromotionOwnerRequest(
	context: PublicApiContext,
	environmentId: string,
	body: CreatePromotionOwnerRequestDto,
): Promise<PromotionOwnerRequestResult> {
	return await makePublicApiRequest(
		context,
		'POST',
		`/promotions/environments/${environmentId}/owner-requests`,
		body,
	);
}
