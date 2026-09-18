import type {
	CreatePromotionConnectionDto,
	CreatePromotionProviderDto,
	PromotionApplyConfigPublicDto,
	PromotionConnectionPublicDto,
	PromotionConnectionScope,
	PromotionDirection,
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
): Promise<PromotionConnection[]> =>
	await fetchAllPages(
		async (cursor) =>
			await request({
				method: 'GET',
				baseURL: context.baseUrl,
				endpoint: `${promotionsApiRoot}/connections`,
				data: { ...filter, cursor },
			}),
	);

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
