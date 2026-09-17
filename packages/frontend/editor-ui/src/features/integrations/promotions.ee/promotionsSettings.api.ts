import type {
	CreatePromotionConnectionDto,
	CreatePromotionProviderDto,
	PromotionApplyConfigPublicDto,
	PromotionCheckoutPublicDto,
	PromotionConnectionListPublicDto,
	PromotionConnectionPublicDto,
	PromotionConnectionScope,
	PromotionDirection,
	PromotePackageDto,
	PromotePackageResultDto,
	PromotionProviderCreatedPublicDto,
	PromotionProviderListPublicDto,
	PromotionProviderPublicDto,
	PromotionPromoteConfigPublicDto,
	UpdatePromotionConnectionDto,
	UpdatePromotionProviderDto,
	UpsertPromotionApplyConfigDto,
	UpsertPromotionPromoteConfigDto,
} from '@n8n/api-types';
import type { PublicApiContext } from '@n8n/rest-api-client';
import { request } from '@n8n/rest-api-client';

/** Includes the SSH public key. */
export type PromotionProvider = PromotionProviderPublicDto;
/** Omits the SSH public key. */
export type PromotionProviderSummary = PromotionProviderListPublicDto['data'][number];
export type PromotionConnection = PromotionConnectionPublicDto;
export type PromotionConnectionSummary = PromotionConnectionListPublicDto['data'][number];

const promotionsApiRoot = '/promotions';

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

export const fetchPromotionConnections = async (
	context: PublicApiContext,
	filter: { scope?: PromotionConnectionScope; providerId?: string } = {},
): Promise<PromotionConnectionSummary[]> =>
	await fetchAllPages(
		async (cursor) =>
			await request({
				method: 'GET',
				baseURL: context.baseUrl,
				endpoint: `${promotionsApiRoot}/connections`,
				data: { ...filter, cursor },
			}),
	);

/** Fetches live checkout state with the stored connection fields. */
export const fetchPromotionConnection = async (
	context: PublicApiContext,
	id: string,
): Promise<PromotionConnection> =>
	await request({
		method: 'GET',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/connections/${id}`,
	});

export const createPromotionConnection = async (
	context: PublicApiContext,
	payload: CreatePromotionConnectionDto,
): Promise<PromotionConnection> =>
	await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/connections`,
		data: payload,
	});

export const updatePromotionConnection = async (
	context: PublicApiContext,
	id: string,
	payload: UpdatePromotionConnectionDto,
): Promise<PromotionConnection> =>
	await request({
		method: 'PUT',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/connections/${id}`,
		data: payload,
	});

export const upsertPromotionApplyConfig = async (
	context: PublicApiContext,
	connectionId: string,
	payload: UpsertPromotionApplyConfigDto,
): Promise<PromotionApplyConfigPublicDto> =>
	await request({
		method: 'PUT',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/connections/${connectionId}/configs/apply`,
		data: payload,
	});

export const upsertPromotionPromoteConfig = async (
	context: PublicApiContext,
	connectionId: string,
	payload: UpsertPromotionPromoteConfigDto,
): Promise<PromotionPromoteConfigPublicDto> =>
	await request({
		method: 'PUT',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/connections/${connectionId}/configs/promote`,
		data: payload,
	});

export const deletePromotionConfig = async (
	context: PublicApiContext,
	connectionId: string,
	direction: PromotionDirection,
): Promise<void> => {
	await request({
		method: 'DELETE',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/connections/${connectionId}/configs/${direction}`,
	});
};

/** Clones one direction into local storage on the instance. Safe to repeat. */
export const clonePromotionCheckout = async (
	context: PublicApiContext,
	connectionId: string,
	direction: PromotionDirection,
): Promise<PromotionCheckoutPublicDto> =>
	await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/connections/${connectionId}/${direction}/clone`,
	});

/** Removes one direction's local checkout. Keeps the config and its credentials. */
export const disconnectPromotionCheckout = async (
	context: PublicApiContext,
	connectionId: string,
	direction: PromotionDirection,
): Promise<PromotionCheckoutPublicDto> =>
	await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/connections/${connectionId}/${direction}/disconnect`,
	});

/** Promotes the whole instance through its instance connection. */
export const promotePackage = async (
	context: PublicApiContext,
	connectionId: string,
	payload: PromotePackageDto,
): Promise<PromotePackageResultDto> =>
	await request({
		method: 'POST',
		baseURL: context.baseUrl,
		endpoint: `${promotionsApiRoot}/connections/${connectionId}/promote`,
		data: payload,
	});
