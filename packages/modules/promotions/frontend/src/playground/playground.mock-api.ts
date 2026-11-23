import type { PromotionPreview, PromotionResourceDetail } from '@n8n/api-types';
import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import { buildPlaygroundDetail } from './playground.data';

/**
 * Development only. Answers the promotion requests of the real preview page with sample data, so
 * the page runs with no server state. It sits in front of axios and touches no product code.
 * Remove it with the rest of the Playground.
 */
const PROMOTE_PATH = /\/promotions\/projects\/[^/]+\/promote$/;
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
export function installMockPromotionApi(
	/** `changed` is true after a Promote found that the list had changed. */
	getPreview: (changed: boolean) => PromotionPreview,
	/** Names the scenario and the amount, so a change of either starts over. */
	getKey: () => string,
): () => void {
	let key = getKey();
	let changed = false;
	const hook = axios.interceptors.request.use((config) => {
		if (!isPromotionsRequest(config)) return config;

		config.adapter = async (adapterConfig) => {
			const url = adapterConfig.url ?? '';
			if (getKey() !== key) {
				key = getKey();
				changed = false;
			}
			const preview = getPreview(changed);

			if (DETAILS_PATH.test(url)) {
				const details = requestedKeys(adapterConfig.data)
					.map((key) => buildPlaygroundDetail(preview, key))
					.filter((detail): detail is PromotionResourceDetail => detail !== undefined);
				return respond(adapterConfig, { details, missingKeys: [] });
			}
			if (CHANGES_PATH.test(url)) return respond(adapterConfig, preview);
			if (PROMOTE_PATH.test(url)) {
				// Each Promote finds that the list changed since the preview. The next preview shows it.
				changed = true;
				return respond(adapterConfig, {
					status: 'preview-changed',
					environmentId: preview.source.environmentId,
				});
			}

			throw new AxiosError(`The Playground has no sample data for ${url}`);
		};
		return config;
	});

	return () => axios.interceptors.request.eject(hook);
}
