import { isAgentModelProvider } from '../../model-providers';
import catalog from './fakeModelCatalog.json';
import type { AgentModelProvider } from '../../model-providers';
import type { ModelPickerConnection, ModelPickerModel } from './modelPicker.utils';

/**
 * The providers the n8n AI gateway serves today. The live list comes from the
 * gateway service. Both the new picker's Gateway credits and the "Current picker"
 * scenario's stand-in gateway use this copy.
 */
export const STAND_IN_GATEWAY_PROVIDERS: AgentModelProvider[] = [
	'google',
	'openai',
	'anthropic',
	'moonshotai',
	'alibaba',
	'minimax',
];

// ponytail: a static catalogue stands in for the model catalog, so the picker
// needs no backend. It is the catalogue of the earlier HTML prototype (v5):
// about 1,100 models, including image, video, speech, embedding and rerank
// models, dated snapshots and OpenRouter variants. Each model lists only the
// agent providers that really serve it: a maker's own key runs that maker's
// models, while gateways and clouds (OpenRouter, Vercel, Bedrock, Vertex,
// Foundry, Groq, NVIDIA) carry many makers. Replace it with `useModelCatalog()`
// when the real catalog reports one entry for each model.
export const FAKE_MODEL_CATALOG: ModelPickerModel[] = catalog.map((model) => ({
	...model,
	providers: model.providers.filter(isAgentModelProvider),
}));

/** Prototype scenario: Gateway credits, two Anthropic credentials, and two OpenRouter credentials. */
export const FAKE_MODEL_CONNECTIONS: ModelPickerConnection[] = [
	{
		id: 'gateway',
		name: 'Gateway credits',
		kind: 'gateway',
		providers: STAND_IN_GATEWAY_PROVIDERS,
		balance: '$1.48',
	},
	{
		id: 'anthropic-account',
		name: 'Anthropic account',
		kind: 'credential',
		providers: ['anthropic'],
	},
	{ id: 'anthropic-team', name: 'Anthropic · Team', kind: 'credential', providers: ['anthropic'] },
	{
		id: 'openrouter-account',
		name: 'OpenRouter account',
		kind: 'credential',
		providers: ['openrouter'],
	},
	{
		id: 'openrouter-team',
		name: 'OpenRouter · Team',
		kind: 'credential',
		providers: ['openrouter'],
	},
];
