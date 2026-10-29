import type {
	ApplyPackageDto,
	ApplyPackageResultDto,
	ApplySelectionDto,
	ContinueApplyPackageDto,
	ContinueApplySelectionDto,
	CreatePromotionEnvironmentDto,
	CreatePromotionProviderDto,
	ListPromotionEnvironmentsQueryDto,
	ListPromotionRepositoriesQueryDto,
	ListPromotionBranchesQueryDto,
	PromotionCheckoutPublicDto,
	PromotionEnvironmentPublicDto,
	PromotionEnvironmentSummary,
	PromotePackageDto,
	PromotePackageResultDto,
	PromotionProviderCreatedPublicDto,
	PromotionProviderPublicDto,
	PromotionRepositoryListPublicDto,
	PromotionBranchListPublicDto,
	UpdatePromotionEnvironmentDto,
	UpdatePromotionProviderDto,
} from '@n8n/api-types';
import type { PublicApiContext } from '@n8n/rest-api-client';
import { makePublicApiRequest, ResponseError } from '@n8n/rest-api-client';

export type PromotionProvider = PromotionProviderPublicDto;
export type PromotionEnvironment = PromotionEnvironmentPublicDto;
export type { PromotionEnvironmentSummary };

const promotionsApiRoot = '/promotions';

export const fetchPromotionRepositories = async (
	context: PublicApiContext,
	providerId: string,
	query: Partial<ListPromotionRepositoriesQueryDto> = {},
): Promise<PromotionRepositoryListPublicDto> =>
	await makePublicApiRequest(
		context,
		'GET',
		`${promotionsApiRoot}/providers/${encodeURIComponent(providerId)}/repositories`,
		query,
	);

export const fetchPromotionBranches = async (
	context: PublicApiContext,
	providerId: string,
	repositoryId: string,
	query: Partial<ListPromotionBranchesQueryDto> = {},
): Promise<PromotionBranchListPublicDto> =>
	await makePublicApiRequest(
		context,
		'GET',
		`${promotionsApiRoot}/providers/${encodeURIComponent(providerId)}/repositories/${encodeURIComponent(repositoryId)}/branches`,
		query,
	);

async function fetchAllPages<T>(
	fetchPage: (cursor?: string) => Promise<{ data: T[]; nextCursor: string | null }>,
): Promise<T[]> {
	const items: T[] = [];
	let cursor: string | undefined;

	do {
		const page = await fetchPage(cursor);
		items.push(...page.data);
		cursor = page.nextCursor ?? undefined;
	} while (cursor);

	return items;
}

export const fetchPromotionProvider = async (
	context: PublicApiContext,
	id: string,
): Promise<PromotionProvider> =>
	await makePublicApiRequest(context, 'GET', `${promotionsApiRoot}/providers/${id}`);

export const createPromotionProvider = async (
	context: PublicApiContext,
	payload: CreatePromotionProviderDto,
): Promise<PromotionProviderCreatedPublicDto> =>
	await makePublicApiRequest(context, 'POST', `${promotionsApiRoot}/providers`, payload);

export const updatePromotionProvider = async (
	context: PublicApiContext,
	id: string,
	payload: UpdatePromotionProviderDto,
): Promise<PromotionProvider> =>
	await makePublicApiRequest(context, 'PUT', `${promotionsApiRoot}/providers/${id}`, payload);

const deletePromotionProvider = async (context: PublicApiContext, id: string): Promise<void> => {
	await makePublicApiRequest(context, 'DELETE', `${promotionsApiRoot}/providers/${id}`);
};

/** The API refuses to delete a provider that an environment still uses, in any scope. */
export const deleteProviderIfUnused = async (context: PublicApiContext, id: string) => {
	try {
		await deletePromotionProvider(context, id);
	} catch (error) {
		if (
			error instanceof ResponseError &&
			(error.httpStatusCode === 404 || error.httpStatusCode === 409)
		)
			return;
		throw error;
	}
};

export const fetchPromotionEnvironments = async (
	context: PublicApiContext,
	filter: Omit<ListPromotionEnvironmentsQueryDto, 'limit' | 'cursor'> = {},
): Promise<PromotionEnvironmentSummary[]> =>
	await fetchAllPages(
		async (cursor) =>
			await makePublicApiRequest(context, 'GET', `${promotionsApiRoot}/environments`, {
				...filter,
				cursor,
			}),
	);

/** Fetches live checkout state with the stored environment fields. */
export const fetchPromotionEnvironment = async (
	context: PublicApiContext,
	id: string,
): Promise<PromotionEnvironment> =>
	await makePublicApiRequest(
		context,
		'GET',
		`${promotionsApiRoot}/environments/${encodeURIComponent(id)}`,
	);

export const createPromotionEnvironment = async (
	context: PublicApiContext,
	payload: CreatePromotionEnvironmentDto,
): Promise<PromotionEnvironment> =>
	await makePublicApiRequest(context, 'POST', `${promotionsApiRoot}/environments`, payload);

export const updatePromotionEnvironment = async (
	context: PublicApiContext,
	id: string,
	payload: UpdatePromotionEnvironmentDto,
): Promise<PromotionEnvironment> =>
	await makePublicApiRequest(context, 'PUT', `${promotionsApiRoot}/environments/${id}`, payload);

export const deletePromotionEnvironment = async (
	context: PublicApiContext,
	id: string,
): Promise<void> => {
	await makePublicApiRequest(context, 'DELETE', `${promotionsApiRoot}/environments/${id}`);
};

/** Connects the environment on the instance. For Git, this clones its branch. Safe to repeat. */
export const connectPromotionCheckout = async (
	context: PublicApiContext,
	environmentId: string,
): Promise<PromotionCheckoutPublicDto> =>
	await makePublicApiRequest(
		context,
		'POST',
		`${promotionsApiRoot}/environments/${environmentId}/connect`,
	);

/** Promotes the whole instance through its instance Promote environment. */
export const promotePackage = async (
	context: PublicApiContext,
	environmentId: string,
	payload: PromotePackageDto,
): Promise<PromotePackageResultDto> =>
	await makePublicApiRequest(
		context,
		'POST',
		`${promotionsApiRoot}/environments/${environmentId}/promote`,
		payload,
	);

export const applyPromotion = async (
	context: PublicApiContext,
	environmentId: string,
	payload?: ApplyPackageDto,
): Promise<ApplyPackageResultDto> =>
	await makePublicApiRequest(
		context,
		'POST',
		`${promotionsApiRoot}/environments/${environmentId}/apply`,
		payload,
	);

/** Resumes an apply that paused on unresolved bindings, once they are created. */
export const continueApplyPromotion = async (
	context: PublicApiContext,
	environmentId: string,
	payload: ContinueApplyPackageDto,
): Promise<ApplyPackageResultDto> =>
	await makePublicApiRequest(
		context,
		'POST',
		`${promotionsApiRoot}/environments/${environmentId}/apply/continue`,
		payload,
	);

/** Applies only the chosen workflows into the destination project. */
export const applyProjectSelection = async (
	context: PublicApiContext,
	projectId: string,
	payload: ApplySelectionDto,
): Promise<ApplyPackageResultDto> =>
	await makePublicApiRequest(
		context,
		'POST',
		`${promotionsApiRoot}/projects/${projectId}/apply`,
		payload,
	);

/** Resumes a selective apply that paused on unresolved bindings, once they are created. */
export const continueApplyProjectSelection = async (
	context: PublicApiContext,
	projectId: string,
	payload: ContinueApplySelectionDto,
): Promise<ApplyPackageResultDto> =>
	await makePublicApiRequest(
		context,
		'POST',
		`${promotionsApiRoot}/projects/${projectId}/apply/continue`,
		payload,
	);
