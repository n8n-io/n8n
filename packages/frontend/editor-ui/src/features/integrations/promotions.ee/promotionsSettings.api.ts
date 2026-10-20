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
	PromotionProviderListPublicDto,
	PromotionProviderPublicDto,
	PromotionRepositoryListPublicDto,
	PromotionBranchListPublicDto,
	UpdatePromotionEnvironmentDto,
	UpdatePromotionProviderDto,
} from '@n8n/api-types';
import type { PublicApiContext } from '@n8n/rest-api-client';
import { request } from '@n8n/rest-api-client';

/** Includes the SSH public key. */
export type PromotionProvider = PromotionProviderPublicDto;
/** Omits the SSH public key. */
export type PromotionProviderSummary = PromotionProviderListPublicDto['data'][number];
export type PromotionEnvironment = PromotionEnvironmentPublicDto;
export type { PromotionEnvironmentSummary };
/**
 * The settings page shows one environment for each direction as one connection. The
 * shared fields come from the Apply environment, else from the Promote one.
 */
export type PromotionConnection = Pick<PromotionEnvironment, 'name' | 'provider' | 'remote'> & {
	configs: {
		apply?: Extract<PromotionEnvironment, { direction: 'apply' }>;
		promote?: Extract<PromotionEnvironment, { direction: 'promote' }>;
	};
};

const promotionsApiRoot = '/promotions';

export const fetchPromotionRepositories = async (
	context: PublicApiContext,
	providerId: string,
	query: Partial<ListPromotionRepositoriesQueryDto> = {},
): Promise<PromotionRepositoryListPublicDto> =>
	await request({
		method: 'GET',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/providers/${encodeURIComponent(providerId)}/repositories`,
		data: query,
	});

export const fetchPromotionBranches = async (
	context: PublicApiContext,
	providerId: string,
	repositoryId: string,
	query: Partial<ListPromotionBranchesQueryDto> = {},
): Promise<PromotionBranchListPublicDto> =>
	await request({
		method: 'GET',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/providers/${encodeURIComponent(providerId)}/repositories/${encodeURIComponent(repositoryId)}/branches`,
		data: query,
	});

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

export const fetchPromotionProviders = async (
	context: PublicApiContext,
): Promise<PromotionProviderSummary[]> =>
	await fetchAllPages(
		async (cursor) =>
			await request({
				method: 'GET',
				baseURL: context.baseUrl,
				endpoint: `${promotionsApiRoot}/providers`,
				data: { cursor },
			}),
	);

/** Fetches the provider with its SSH public key. */
export const fetchPromotionProvider = async (
	context: PublicApiContext,
	id: string,
): Promise<PromotionProvider> =>
	await request({
		method: 'GET',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/providers/${id}`,
	});

export const createPromotionProvider = async (
	context: PublicApiContext,
	payload: CreatePromotionProviderDto,
): Promise<PromotionProviderCreatedPublicDto> =>
	await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/providers`,
		data: payload,
	});

export const updatePromotionProvider = async (
	context: PublicApiContext,
	id: string,
	payload: UpdatePromotionProviderDto,
): Promise<PromotionProvider> =>
	await request({
		method: 'PUT',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/providers/${id}`,
		data: payload,
	});

export const deletePromotionProvider = async (
	context: PublicApiContext,
	id: string,
): Promise<void> => {
	await request({
		method: 'DELETE',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/providers/${id}`,
	});
};

export const fetchPromotionEnvironments = async (
	context: PublicApiContext,
	filter: Omit<ListPromotionEnvironmentsQueryDto, 'limit' | 'cursor'> = {},
): Promise<PromotionEnvironmentSummary[]> =>
	await fetchAllPages(
		async (cursor) =>
			await request({
				method: 'GET',
				baseURL: context.baseUrl,
				endpoint: `${promotionsApiRoot}/environments`,
				data: { ...filter, cursor },
			}),
	);

/** Fetches live checkout state with the stored environment fields. */
export const fetchPromotionEnvironment = async (
	context: PublicApiContext,
	id: string,
): Promise<PromotionEnvironment> =>
	await request({
		method: 'GET',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/environments/${id}`,
	});

export const createPromotionEnvironment = async (
	context: PublicApiContext,
	payload: CreatePromotionEnvironmentDto,
): Promise<PromotionEnvironment> =>
	await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/environments`,
		data: payload,
	});

export const updatePromotionEnvironment = async (
	context: PublicApiContext,
	id: string,
	payload: UpdatePromotionEnvironmentDto,
): Promise<PromotionEnvironment> =>
	await request({
		method: 'PUT',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/environments/${id}`,
		data: payload,
	});

export const deletePromotionEnvironment = async (
	context: PublicApiContext,
	id: string,
): Promise<void> => {
	await request({
		method: 'DELETE',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/environments/${id}`,
	});
};

/** Connects the environment on the instance. For Git, this clones its branch. Safe to repeat. */
export const connectPromotionCheckout = async (
	context: PublicApiContext,
	environmentId: string,
): Promise<PromotionCheckoutPublicDto> =>
	await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/environments/${environmentId}/connect`,
	});

/** Removes the environment's local checkout. Keeps the environment and its credentials. */
export const disconnectPromotionCheckout = async (
	context: PublicApiContext,
	environmentId: string,
): Promise<PromotionCheckoutPublicDto> =>
	await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/environments/${environmentId}/disconnect`,
	});

/** Promotes the whole instance through its instance Promote environment. */
export const promotePackage = async (
	context: PublicApiContext,
	environmentId: string,
	payload: PromotePackageDto,
): Promise<PromotePackageResultDto> =>
	await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/environments/${environmentId}/promote`,
		data: payload,
	});

export const applyPromotion = async (
	context: PublicApiContext,
	environmentId: string,
	payload?: ApplyPackageDto,
): Promise<ApplyPackageResultDto> =>
	await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/environments/${environmentId}/apply`,
		data: payload,
	});

/** Resumes an apply that paused on unresolved bindings, once they are created. */
export const continueApplyPromotion = async (
	context: PublicApiContext,
	environmentId: string,
	payload: ContinueApplyPackageDto,
): Promise<ApplyPackageResultDto> =>
	await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/environments/${environmentId}/apply/continue`,
		data: payload,
	});

/** Applies only the chosen workflows into the destination project. */
export const applyProjectSelection = async (
	context: PublicApiContext,
	projectId: string,
	payload: ApplySelectionDto,
): Promise<ApplyPackageResultDto> =>
	await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/projects/${projectId}/apply`,
		data: payload,
	});

/** Resumes a selective apply that paused on unresolved bindings, once they are created. */
export const continueApplyProjectSelection = async (
	context: PublicApiContext,
	projectId: string,
	payload: ContinueApplySelectionDto,
): Promise<ApplyPackageResultDto> =>
	await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/projects/${projectId}/apply/continue`,
		data: payload,
	});
