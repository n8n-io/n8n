import type { PromotionPreview, PromotionResourceDetail } from '@n8n/api-types';
import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import { buildPlaygroundDetail } from './playground.data';

/**
 * Development only. Answers the promotion requests of the real preview page with sample data, so
 * the page runs with no server state. It sits in front of axios and touches no product code.
 * Remove it with the rest of the Playground.
 */
const CHANGES_PATH = /\/promotions\/projects\/[^/]+\/changes\/(promote|apply)$/;
const DETAILS_PATH = /\/promotions\/projects\/[^/]+\/changes\/(promote|apply)\/details$/;

const isPromotionsRequest = ({ url }: InternalAxiosRequestConfig) =>
	typeof url === 'string' && url.includes('/promotions/');

const respond = (config: InternalAxiosRequestConfig, data: unknown): AxiosResponse => ({
	data,
	status: 200,
	statusText: 'OK',
	headers: {},
	config,
});

/** The keys that a details request asks for. */
function requestedKeys(data: unknown): string[] {
	if (typeof data !== 'string') return [];
	const body: unknown = JSON.parse(data);
	if (typeof body !== 'object' || body === null || !('keys' in body) || !Array.isArray(body.keys)) {
		return [];
	}
	return body.keys.filter((key): key is string => typeof key === 'string');
}

/**
 * Routes the requests of the preview page to `getPreview`. A request that the Playground does not
 * know fails, so a missing answer shows up instead of an empty page.
 * Returns a function that removes the hook.
 */
export function installMockPromotionApi(getPreview: () => PromotionPreview): () => void {
	const hook = axios.interceptors.request.use((config) => {
		if (!isPromotionsRequest(config)) return config;

		config.adapter = async (adapterConfig) => {
			const url = adapterConfig.url ?? '';
			const preview = getPreview();

			if (DETAILS_PATH.test(url)) {
				const details = requestedKeys(adapterConfig.data)
					.map((key) => buildPlaygroundDetail(preview, key))
					.filter((detail): detail is PromotionResourceDetail => detail !== undefined);
				return respond(adapterConfig, { details, missingKeys: [] });
			}
			if (CHANGES_PATH.test(url)) return respond(adapterConfig, preview);

			throw new AxiosError(`The Playground has no sample data for ${url}`);
		};
		return config;
	});

	return () => axios.interceptors.request.eject(hook);
}
