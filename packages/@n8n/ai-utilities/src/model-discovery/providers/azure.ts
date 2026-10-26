import { UserError } from 'n8n-workflow';

import { byName } from '../request';
import type { ProviderModel } from '../types';

/**
 * Not a {@link ListModelsFn} and not in `MODEL_DISCOVERY_PROVIDERS`: Azure
 * needs a `project` and pre-built auth headers, which don't fit
 * `ListModelsOptions`'s `apiKey` shape. Call this directly instead of through
 * `listModelsForProvider`.
 */
export interface AzureOpenAiListModelsOptions {
	/**
	 * Origin of the Azure resource that owns the project, e.g.
	 * `https://<resource>.services.ai.azure.com`. Same host for Classic and
	 * Foundry: derive it from `resourceName` for Classic, or from the origin
	 * of the Foundry endpoint.
	 */
	baseURL: string;
	/** Foundry project that scopes the deployments call. */
	project: string;
	/** `{ 'api-key': ... }` for the API-key credential, `{ Authorization: 'Bearer ...' }` for Entra ID. */
	headers: Record<string, string>;
	apiVersion?: string;
	fetch?: typeof globalThis.fetch;
}

/**
 * A deployment and the API it answers on: `anthropic` for Claude deployments
 * (Anthropic Messages API), `openai` for every other chat deployment.
 */
export interface AzureDeploymentModel extends ProviderModel {
	modelFamily: 'openai' | 'anthropic';
	/** The model the deployment serves, for example `gpt-4.1`, when Azure reports it. */
	modelName?: string;
}

/**
 * Audience of the Foundry deployments-list call. Entra ID grants access per
 * audience, so only that call requests a token for it, not every inference call.
 */
export const AZURE_AI_FOUNDRY_AUDIENCE = 'https://ai.azure.com';

/** The deployments API lives on the origin of the Foundry inference endpoint. */
export function getAzureFoundryOrigin(endpoint: string): string {
	return new URL(endpoint.trim()).origin;
}

/** The deployments call returned 404 for the requested project. */
export class AzureProjectNotFoundError extends UserError {
	constructor(project: string) {
		super(`Project "${project}" was not found. Check the project name and try again.`, {
			shouldReport: false,
		});
	}
}

interface AzureDeployment {
	name?: unknown;
	modelName?: unknown;
	modelPublisher?: unknown;
	capabilities?: Record<string, unknown>;
}

function isAnthropicDeployment(deployment: AzureDeployment): boolean {
	const publisher =
		typeof deployment.modelPublisher === 'string' ? deployment.modelPublisher.toLowerCase() : '';
	const modelName =
		typeof deployment.modelName === 'string' ? deployment.modelName.toLowerCase() : '';
	return publisher === 'anthropic' || modelName.startsWith('claude');
}

/**
 * A deployment is chat-capable when its `capabilities` map reports
 * `chat_completion`. The API's own dictionary uses string values, but a
 * boolean is accepted too since the exact wire casing/type is not documented.
 */
export function shouldIncludeAzureModel(
	capabilities: Record<string, unknown> | undefined,
): boolean {
	const value = capabilities?.chat_completion ?? capabilities?.chatCompletion;
	return value === true || (typeof value === 'string' && value.toLowerCase() === 'true');
}

/**
 * Source: ENT-477. Lists a Foundry project's deployments and keeps the
 * chat-capable ones (an embeddings deployment reports no `chat_completion`
 * capability). The deployment *name* is what the inference call accepts, not
 * the underlying model name, so it becomes the id.
 */
export async function listAzureOpenAiModels(
	options: AzureOpenAiListModelsOptions,
): Promise<AzureDeploymentModel[]> {
	const fetchFn = options.fetch ?? globalThis.fetch;
	const apiVersion = options.apiVersion ?? 'v1';
	const base = options.baseURL.replace(/\/+$/, '');
	const url = `${base}/api/projects/${encodeURIComponent(options.project)}/deployments?api-version=${apiVersion}`;

	const response = await fetchFn(url, { method: 'GET', headers: options.headers });

	if (!response.ok) {
		if (response.status === 401 || response.status === 403) {
			throw new UserError(
				"Models couldn't be loaded. Check that the selected credential is valid and has the required permissions, then try again.",
				{ shouldReport: false },
			);
		}
		if (response.status === 404) {
			throw new AzureProjectNotFoundError(options.project);
		}
		const body = await response.text().catch(() => '');
		throw new Error(
			`Failed to list Azure OpenAI deployments (status ${response.status})${body ? `: ${body.slice(0, 500)}` : ''}`,
		);
	}

	const data = (await response.json()) as { value?: AzureDeployment[] };

	return (data.value ?? [])
		.filter(
			(deployment): deployment is AzureDeployment & { name: string } =>
				typeof deployment.name === 'string' && shouldIncludeAzureModel(deployment.capabilities),
		)
		.map(
			(deployment): AzureDeploymentModel => ({
				id: deployment.name,
				name:
					typeof deployment.modelName === 'string'
						? `${deployment.name} (${deployment.modelName})`
						: deployment.name,
				modelFamily: isAnthropicDeployment(deployment) ? 'anthropic' : 'openai',
				...(typeof deployment.modelName === 'string' ? { modelName: deployment.modelName } : {}),
			}),
		)
		.sort(byName);
}
