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

/** The endpoints of the changes view of an environment, across projects. */
const environmentPaths = {
	changes: (environmentId: string, direction: PromotionDirection) =>
		`/promotions/environments/${environmentId}/changes/${direction}`,
	details: (environmentId: string, direction: PromotionDirection) =>
		`/promotions/environments/${environmentId}/changes/${direction}/details`,
	promote: (environmentId: string) => `/promotions/environments/${environmentId}/promote-selection`,
	apply: (environmentId: string) => `/promotions/environments/${environmentId}/apply-selection`,
	instanceApplyPreview: (environmentId: string) =>
		`/promotions/environments/${environmentId}/changes`,
};

/** The page also accepts the rows without the list of projects, and derives the projects. */
export type EnvironmentChangesResponse = Omit<
	PromotionEnvironmentChanges,
	'direction' | 'projects'
> &
	Partial<Pick<PromotionEnvironmentChanges, 'direction' | 'projects'>>;

/**
 * The changes of every project of the environment that the user can read. A project lists its
 * changes only when the user can also run the operation in it.
 */
export async function getPromotionEnvironmentChanges(
	context: PublicApiContext,
	environmentId: string,
	direction: PromotionDirection,
): Promise<EnvironmentChangesResponse> {
	return await makePublicApiRequest(
		context,
		'GET',
		environmentPaths.changes(environmentId, direction),
	);
}

/**
 * The preview of the Apply of the whole instance. Only this preview lists the projects that the
 * Apply deletes, and its `revision` is the one that the whole-instance Apply accepts. It needs
 * the global scope `promotions:apply` and an instance environment.
 */
export async function getPromotionInstanceApplyPreview(
	context: PublicApiContext,
	environmentId: string,
): Promise<PromotionInstanceApplyPreview> {
	return await makePublicApiRequest(
		context,
		'GET',
		environmentPaths.instanceApplyPreview(environmentId),
	);
}

export async function getPromotionEnvironmentDetails(
	context: PublicApiContext,
	environmentId: string,
	direction: PromotionDirection,
	payload: PromotionResourceDetailsRequestDto,
): Promise<PromotionResourceDetails> {
	return await makePublicApiRequest(
		context,
		'POST',
		environmentPaths.details(environmentId, direction),
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

/**
 * Applies a selection across projects. The server keeps no session: to continue after a
 * `blocked` result, send the same request again with `expectedSource`, and with
 * `confirmDestructiveChanges` when the user confirmed the destructive changes.
 */
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
