import type { AgentCatalogModel } from '@n8n/api-types';
import type { IconName } from '@n8n/design-system';
import type { BaseTextKey } from '@n8n/i18n';
import maxBy from 'lodash/maxBy';
import minBy from 'lodash/minBy';

import type { AgentModelProvider } from '../../model-providers';

/** One model, whatever provider serves it. Field names follow the real catalog. */
export interface ModelPickerModel
	extends Pick<AgentCatalogModel, 'id' | 'name' | 'releaseDate' | 'reasoning' | 'cost' | 'limits'> {
	/** Company that makes the model, for example `anthropic`. */
	lab: string;
	/** Providers that can serve the model. */
	providers: AgentModelProvider[];
	/** A dated snapshot or a provider variant (free, batch) of another model. */
	variant?: boolean;
	/** The model writes text, so an agent can use it. Image, speech and embedding models do not. */
	textOutput?: boolean;
	/** The model accepts image input. */
	vision?: boolean;
	videoInput?: boolean;
	audioInput?: boolean;
	imageOutput?: boolean;
	videoOutput?: boolean;
	/** Speech or other audio. */
	audioOutput?: boolean;
	embeddings?: boolean;
	rerank?: boolean;
	transcription?: boolean;
}

/** A way to pay for model calls: Gateway credits or one credential. */
export interface ModelPickerConnection {
	id: string;
	name: string;
	kind: 'gateway' | 'credential';
	/** Providers this connection can call. A credential has one. */
	providers: AgentModelProvider[];
	/** Remaining Gateway credits, formatted for display. */
	balance?: string;
}

export interface ModelPickerSelection {
	modelId: string;
	connectionId: string;
}

export type ModelPickerPresetId = 'recommended' | 'cheaper' | 'largestContext';
/**
 * What a model works with beyond text, folded into a few groups: Image covers
 * image input and image generation, and so on. The model keeps the detailed flags.
 */
export type ModelPickerFeature = 'image' | 'video' | 'audio' | 'embeddings' | 'reasoning';

/** The icon, the name and the test of each feature, in the order a row shows them. */
export const MODEL_PICKER_FEATURES: Record<
	ModelPickerFeature,
	{ icon: IconName; labelKey: BaseTextKey; has: (model: ModelPickerModel) => boolean }
> = {
	image: {
		icon: 'image',
		labelKey: 'agents.modelPicker.feature.image',
		has: (model) => Boolean(model.vision || model.imageOutput),
	},
	video: {
		icon: 'video',
		labelKey: 'agents.modelPicker.feature.video',
		has: (model) => Boolean(model.videoInput || model.videoOutput),
	},
	audio: {
		icon: 'volume-2',
		labelKey: 'agents.modelPicker.feature.audio',
		has: (model) => Boolean(model.audioInput || model.audioOutput || model.transcription),
	},
	embeddings: {
		icon: 'binary',
		labelKey: 'agents.modelPicker.feature.embeddings',
		has: (model) => Boolean(model.embeddings || model.rerank),
	},
	reasoning: {
		icon: 'brain',
		labelKey: 'agents.modelPicker.feature.reasoning',
		has: (model) => Boolean(model.reasoning),
	},
};

export type ModelPickerCostFilter = 'any' | 'free' | 'upTo1' | 'upTo5';

export interface ModelPickerFilters {
	search: string;
	features: ModelPickerFeature[];
	cost: ModelPickerCostFilter;
}

/** Highest input price in USD for each million tokens that a cost filter lets through. */
const MAX_INPUT_COST: Record<ModelPickerCostFilter, number> = {
	any: Infinity,
	free: 0,
	upTo1: 1,
	upTo5: 5,
};

// ponytail: a fixed shortlist stands in for a real recommendation. The first
// available entry wins. Replace it when the catalog reports a ranking.
const RECOMMENDED_MODEL_IDS = [
	'anthropic/claude-sonnet-5-5',
	'openai/gpt-6-sol',
	'google/gemini-4-argon',
];

function totalCost(model: ModelPickerModel): number {
	return (model.cost?.input ?? 0) + (model.cost?.output ?? 0);
}

export function connectionsForModel(
	model: ModelPickerModel,
	connections: ModelPickerConnection[],
): ModelPickerConnection[] {
	return connections.filter((connection) =>
		connection.providers.some((provider) => model.providers.includes(provider)),
	);
}

/** Keeps the current connection when it can serve the model. A credential wins over Gateway credits. */
export function pickConnection(
	model: ModelPickerModel,
	connections: ModelPickerConnection[],
	currentConnectionId?: string,
): ModelPickerConnection | undefined {
	const candidates = connectionsForModel(model, connections);
	return (
		candidates.find((connection) => connection.id === currentConnectionId) ??
		candidates.find((connection) => connection.kind === 'credential') ??
		candidates[0]
	);
}

export function getPresets(
	allModels: ModelPickerModel[],
): Array<{ id: ModelPickerPresetId; model: ModelPickerModel }> {
	// Only models an agent can run, and no snapshots or variants of them.
	const models = allModels.filter((model) => model.textOutput && !model.variant);
	const recommended =
		RECOMMENDED_MODEL_IDS.map((id) => models.find((model) => model.id === id)).find(Boolean) ??
		models[0];
	if (!recommended) return [];

	// Each suggestion comes from a different lab, so the first page compares
	// providers. Cheaper means at most half the price, so the saving is real. The
	// catalog lists labs in turn, so the first match is a current model from the
	// next lab, often an open-weight one. Free models are left out: they are
	// mostly previews with rate limits.
	const cheaperModels = models.filter(
		(model) => totalCost(model) > 0 && totalCost(model) < totalCost(recommended),
	);
	const cheaper =
		cheaperModels.find(
			(model) => model.lab !== recommended.lab && totalCost(model) <= totalCost(recommended) / 2,
		) ?? minBy(cheaperModels, totalCost);

	const usedLabs = new Set([recommended.lab, cheaper?.lab]);
	const others = models.filter((model) => model !== recommended && model !== cheaper);
	const byContext = (model: ModelPickerModel) => model.limits?.context ?? 0;
	const largestContext =
		maxBy(
			others.filter((model) => !usedLabs.has(model.lab)),
			byContext,
		) ?? maxBy(others, byContext);

	return [
		{ id: 'recommended' as const, model: recommended },
		...(cheaper ? [{ id: 'cheaper' as const, model: cheaper }] : []),
		...(largestContext ? [{ id: 'largestContext' as const, model: largestContext }] : []),
	];
}

export function filterModels(
	models: ModelPickerModel[],
	{ search, features, cost }: ModelPickerFilters,
): ModelPickerModel[] {
	const query = search.trim().toLowerCase();
	return models.filter(
		(model) =>
			(!query || `${model.name} ${model.id}`.toLowerCase().includes(query)) &&
			features.every((feature) => MODEL_PICKER_FEATURES[feature].has(model)) &&
			(model.cost?.input ?? Infinity) <= MAX_INPUT_COST[cost],
	);
}

const contextFormat = new Intl.NumberFormat('en-US', {
	notation: 'compact',
	maximumSignificantDigits: 2,
});
const costFormat = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	minimumFractionDigits: 0,
	maximumFractionDigits: 3,
});

export function formatContext(tokens: number): string {
	return contextFormat.format(tokens);
}

export function formatCost(usdPerMillionTokens: number): string {
	return costFormat.format(usdPerMillionTokens);
}

/** Bar length from 0 to 1. The square root keeps cheap models visible beside a few expensive ones. */
export function meterRatio(value: number, max: number): number {
	return max > 0 ? Math.sqrt(Math.min(value, max) / max) : 0;
}
