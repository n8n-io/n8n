/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/no-require-imports */
import type { GoogleVertexProviderSettings } from '@ai-sdk/google-vertex';
import { formatPemBlock } from '@n8n/utils/format-pem-block';
import { isRecord } from '@n8n/utils/is-record';
import type { LanguageModel } from 'ai';

import type { FetchFn } from './model-factory';
import type { ProviderCredentials } from './provider-credentials';

type VertexSettings = GoogleVertexProviderSettings & { project: string; location: string };

const VERTEX_MAAS_MODEL_PREFIXES = [
	'deepseek-ai/deepseek-',
	'google/gemma-',
	'meta/llama-',
	'minimax/minimax-',
	'moonshotai/kimi-',
	'openai/gpt-oss-',
	'qwen/qwen',
	'zai-org/glm-',
];

/** Keep saved models usable when catalog metadata is unavailable. */
export function resolveGoogleVertexSdk(model: string, sdk?: string): string | undefined {
	if (sdk !== undefined) return sdk;
	if (model.startsWith('gemini-')) return '@ai-sdk/google-vertex';
	if (model.startsWith('claude-')) return '@ai-sdk/google-vertex/anthropic';
	if (model.startsWith('mistral-') || model.startsWith('codestral-')) return '@ai-sdk/mistral';
	if (
		model.startsWith('xai/grok-') ||
		(model.endsWith('-maas') &&
			VERTEX_MAAS_MODEL_PREFIXES.some((prefix) => model.startsWith(prefix)))
	) {
		return '@ai-sdk/openai-compatible';
	}
	return undefined;
}

/** Vertex models need the thinking options of their underlying API. */
export function getGoogleVertexQuirksProvider(model: string, sdk?: string): string {
	switch (resolveGoogleVertexSdk(model, sdk)) {
		case '@ai-sdk/google-vertex':
			return 'google';
		case '@ai-sdk/google-vertex/anthropic':
			return 'google-vertex-anthropic';
		default:
			return 'google-vertex';
	}
}

/** Select the Vertex API for the model. */
export function createGoogleVertexModel(
	creds: ProviderCredentials<'google-vertex'>,
	model: string,
	fetch?: FetchFn,
): LanguageModel {
	const settings: VertexSettings = {
		project: creds.project,
		location: creds.location,
		googleAuthOptions: {
			credentials: {
				client_email: creds.clientEmail,
				private_key: formatPemBlock(creds.privateKey),
			},
		},
		fetch,
	};
	const sdk = resolveGoogleVertexSdk(model, creds.sdk);
	switch (sdk) {
		case '@ai-sdk/google-vertex': {
			const { createGoogleVertex } =
				require('@ai-sdk/google-vertex') as typeof import('@ai-sdk/google-vertex');
			// An empty key prevents GOOGLE_VERTEX_API_KEY from selecting Express mode.
			return createGoogleVertex({ ...settings, apiKey: '' })(model);
		}
		case '@ai-sdk/google-vertex/anthropic': {
			const { createVertexAnthropic } =
				require('@ai-sdk/google-vertex/anthropic') as typeof import('@ai-sdk/google-vertex/anthropic');
			return createVertexAnthropic(settings)(model);
		}
		case '@ai-sdk/mistral':
			return createVertexMistralModel(settings, model);
		case '@ai-sdk/openai-compatible': {
			if (model.startsWith('xai/')) {
				// The xAI adapter handles Grok's reasoning-token accounting.
				const { createGoogleVertexXai } =
					require('@ai-sdk/google-vertex/xai') as typeof import('@ai-sdk/google-vertex/xai');
				return createGoogleVertexXai(settings)(model);
			}
			const { createVertexMaas } =
				require('@ai-sdk/google-vertex/maas') as typeof import('@ai-sdk/google-vertex/maas');
			return createVertexMaas(settings)(model);
		}
		default:
			throw new Error(`No supported Vertex SDK is configured for model "${model}".`);
	}
}

function getVertexBaseUrl(project: string, location: string): string {
	let host = `${location}-aiplatform.googleapis.com`;
	if (location === 'global') {
		host = 'aiplatform.googleapis.com';
	} else if (location === 'eu' || location === 'us') {
		host = `aiplatform.${location}.rep.googleapis.com`;
	}
	return `https://${host}/v1/projects/${project}/locations/${location}`;
}

/** Mistral uses its native payload with Vertex authentication and prediction methods. */
function createVertexMistralModel(settings: VertexSettings, model: string): LanguageModel {
	const { createMistral } = require('@ai-sdk/mistral') as typeof import('@ai-sdk/mistral');
	const { GoogleAuth } = require('google-auth-library') as typeof import('google-auth-library');
	const { parseJSON } =
		require('@ai-sdk/provider-utils') as typeof import('@ai-sdk/provider-utils');
	const auth = new GoogleAuth({
		...settings.googleAuthOptions,
		scopes: ['https://www.googleapis.com/auth/cloud-platform'],
	});
	const baseURL = `${getVertexBaseUrl(settings.project, settings.location)}/publishers/mistralai/models`;
	const fetch: FetchFn = async (_url, init) => {
		if (typeof init?.body !== 'string') {
			throw new Error('Vertex Mistral requires a JSON request body.');
		}
		const body = await parseJSON({ text: init.body });
		if (!isRecord(body)) {
			throw new Error('Vertex Mistral requires a JSON object.');
		}
		const token = await auth.getAccessToken();
		if (!token) throw new Error('Could not get a Google Vertex access token.');
		const headers = new Headers(init.headers);
		headers.set('Authorization', `Bearer ${token}`);
		const method = body.stream === true ? 'streamRawPredict' : 'rawPredict';
		return await (settings.fetch ?? globalThis.fetch)(`${baseURL}/${model}:${method}`, {
			...init,
			headers,
		});
	};
	return createMistral({ apiKey: '', baseURL, fetch })(model);
}

/** Parse service-account JSON for the standalone Vertex Anthropic provider. */
export function parseGoogleVertexAuthOptions(
	googleCredentials: string | undefined,
): { credentials: Record<string, unknown> } | undefined {
	if (!googleCredentials?.trim()) return undefined;
	let parsed: unknown;
	try {
		parsed = JSON.parse(googleCredentials);
	} catch {
		throw new Error(
			'Invalid credentials for provider "google-vertex-anthropic": googleCredentials must be valid JSON',
		);
	}
	if (!isRecord(parsed)) {
		throw new Error(
			'Invalid credentials for provider "google-vertex-anthropic": googleCredentials must be a JSON object',
		);
	}
	const credentials = { ...parsed };
	// Environment files can contain literal newline escapes.
	if (typeof credentials.private_key === 'string') {
		credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
	}
	return { credentials };
}
