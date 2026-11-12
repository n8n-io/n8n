import type { AgentCatalogModel } from '@n8n/api-types';
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
	/** The model accepts image input. */
	vision?: boolean;
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
export type ModelPickerFeature = 'vision' | 'reasoning';
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
	models: ModelPickerModel[],
): Array<{ id: ModelPickerPresetId; model: ModelPickerModel }> {
	const recommended =
		RECOMMENDED_MODEL_IDS.map((id) => models.find((model) => model.id === id)).find(Boolean) ??
		models[0];
	if (!recommended) return [];

	// A cheaper model from the same lab is the closest swap. Free models are left
	// out: they are mostly previews with rate limits.
	const cheaperModels = models.filter(
		(model) => totalCost(model) > 0 && totalCost(model) < totalCost(recommended),
	);
	const sameLab = cheaperModels.filter((model) => model.lab === recommended.lab);
	const cheaper = minBy(sameLab.length > 0 ? sameLab : cheaperModels, totalCost);

	const largestContext = maxBy(
		models.filter((model) => model !== recommended && model !== cheaper),
		(model) => model.limits?.context ?? 0,
	);

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
			features.every((feature) => model[feature]) &&
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
