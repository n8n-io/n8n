import type { PromotionPreview, PromotionResourceDetail } from '@n8n/api-types';
import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import { buildPlaygroundDetail, type PlaygroundState } from './playground.data';

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

export const respond = (config: InternalAxiosRequestConfig, data: unknown): AxiosResponse => ({
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

/** The name of a credential, or the key of a variable, in a create request. */
function createdName(data: unknown): string | undefined {
	if (typeof data !== 'string') return undefined;
	const body: unknown = JSON.parse(data);
	if (typeof body !== 'object' || body === null) return undefined;
	if ('name' in body && typeof body.name === 'string') return body.name;
	if ('key' in body && typeof body.key === 'string') return body.key;
	return undefined;
}

/**
 * Routes the requests of the preview page to `getPreview`. A request that the Playground does not
 * know fails, so a missing answer shows up instead of an empty page.
 * Returns a function that removes the hook.
 */
export function installMockPromotionApi(
	/** The state holds what the user did, so the next preview shows it. */
	getPreview: (state: Required<PlaygroundState>) => PromotionPreview,
	/** Names the scenario and the amount, so a change of either starts over. */
	getKey: () => string,
): () => void {
	let key = getKey();
	let changed = false;
	const resolved = new Set<string>();
	const hook = axios.interceptors.request.use((config) => {
		if (!isPromotionsRequest(config)) return config;

		config.adapter = async (adapterConfig) => {
			const url = adapterConfig.url ?? '';
			if (getKey() !== key) {
				key = getKey();
				changed = false;
				resolved.clear();
			}
			const preview = getPreview({ changed, resolved });

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

	// The real editors create the credential or variable. Remember its name, so the next preview
	// no longer lists it as missing, as the server does after it saved it.
	const watcher = axios.interceptors.response.use((response) => {
		const { method, url, data } = response.config;
		const created =
			method?.toLowerCase() === 'post' && /\/(credentials|variables)$/.test(url ?? '');
		if (created) {
			const name = createdName(data);
			if (name) resolved.add(name);
		}
		return response;
	});

	return () => {
		axios.interceptors.request.eject(hook);
		axios.interceptors.response.eject(watcher);
	};
}
