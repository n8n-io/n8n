import { fetchProviderCatalog, type ModelInfo, type ProviderCatalog } from '@n8n/agents';

const MODEL_RECOMMENDATION_FETCH_TIMEOUT_MS = 5000;
const MAX_RECOMMENDED_MODELS_PER_PROVIDER = 3;

interface RecommendedProvider {
	id: string;
	label: string;
}

const RECOMMENDED_PROVIDERS: RecommendedProvider[] = [
	{ id: 'anthropic', label: 'Anthropic' },
	{ id: 'openai', label: 'OpenAI' },
	{ id: 'mistral', label: 'Mistral' },
	{ id: 'xai', label: 'xAI' },
	{ id: 'google', label: 'Gemini' },
];

let modelRecommendationsSection: string | null | undefined;
let modelRecommendationsPromise: Promise<string | null> | undefined;

function getReleaseTime(model: ModelInfo): number | null {
	if (!model.releaseDate) return null;

	const releaseTime = Date.parse(model.releaseDate);
	return Number.isNaN(releaseTime) ? null : releaseTime;
}

function compareByReleaseDateDesc(a: ModelInfo, b: ModelInfo): number {
	const aReleaseTime = getReleaseTime(a);
	const bReleaseTime = getReleaseTime(b);

	if (aReleaseTime !== null && bReleaseTime !== null && aReleaseTime !== bReleaseTime) {
		return bReleaseTime - aReleaseTime;
	}

	if (aReleaseTime !== null && bReleaseTime === null) return -1;
	if (aReleaseTime === null && bReleaseTime !== null) return 1;
	return a.id.localeCompare(b.id);
}

function getProviderModels(catalog: ProviderCatalog, providerId: string): ModelInfo[] {
	const provider = catalog[providerId];
	if (!provider) return [];

	const models = Object.values(provider.models);
	const toolCapableModels = models.filter((model) => model.toolCall);
	return toolCapableModels.length > 0 ? toolCapableModels : models;
}

function formatModel(model: ModelInfo, providerId: string): string {
	const flags = [
		model.releaseDate ? `released ${model.releaseDate}` : null,
		model.reasoning ? 'reasoning' : null,
		model.toolCall ? 'tools' : null,
		model.limits?.context ? `${Math.round(model.limits.context / 1000)}k context` : null,
	].filter((flag): flag is string => flag !== null);

	const suffix = flags.length > 0 ? ` (${flags.join(', ')})` : '';
	return `\`${providerId}/${model.id}\` ${model.name}${suffix}`;
}

export function buildModelRecommendationsSection(catalog: ProviderCatalog): string | null {
	const rows = RECOMMENDED_PROVIDERS.flatMap((provider) => {
		const models = getProviderModels(catalog, provider.id)
			.sort(compareByReleaseDateDesc)
			.slice(0, MAX_RECOMMENDED_MODELS_PER_PROVIDER)
			.map((model) => formatModel(model, provider.id));

		return models.length > 0 ? [`- ${provider.label}: ${models.join('; ')}`] : [];
	});

	if (rows.length === 0) return null;

	return `\
## Recommended LLM models

These recommendations are derived from the live models.dev catalog exposed by the agents SDK.
The provider lists are selected by newest release_date first, limited to
tool-capable models when the catalog marks any models for that provider as
tool-capable.
Treat this list as authoritative for model recommendations. Use these models
when the user does not know what model to pick. Prefer a recommended model for
a provider the user has credentials for; then call resolve_llm with that
provider and model, or ask_llm if the user needs to choose a credential.
Do not mention models outside this list unless the user explicitly names one
and resolve_llm validates it. Do not write a model or credential directly
without a resolve_llm or ask_llm result.

${rows.join('\n')}`;
}

async function fetchProviderCatalogWithTimeout(): Promise<ProviderCatalog | null> {
	let timeout: ReturnType<typeof setTimeout> | undefined;
	const timeoutPromise = new Promise<null>((resolve) => {
		timeout = setTimeout(() => resolve(null), MODEL_RECOMMENDATION_FETCH_TIMEOUT_MS);
	});

	const catalogPromise = fetchProviderCatalog();
	void catalogPromise.catch(() => undefined);

	const result = await Promise.race([catalogPromise, timeoutPromise]);
	if (timeout) clearTimeout(timeout);

	return result;
}

export async function getModelRecommendationsSection(): Promise<string | null> {
	if (modelRecommendationsSection !== undefined) return modelRecommendationsSection;

	modelRecommendationsPromise ??= fetchProviderCatalogWithTimeout()
		.then((catalog) => (catalog ? buildModelRecommendationsSection(catalog) : null))
		.catch(() => null)
		.finally(() => {
			modelRecommendationsPromise = undefined;
		});

	const section = await modelRecommendationsPromise;
	if (section) modelRecommendationsSection = section;
	return section;
}
