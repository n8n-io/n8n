import { isAgentModelProvider } from '../../model-providers';
import catalog from './fakeModelCatalog.json';
import type { ModelPickerConnection, ModelPickerModel } from './modelPicker.utils';

// ponytail: a static snapshot of models.dev stands in for the model catalog, so
// the picker needs no backend. It holds the 120 newest tool-calling models that
// the agent providers serve. Replace it with `useModelCatalog()` when the real
// catalog reports one entry for each model.
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
		providers: ['openai', 'anthropic', 'google'],
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
