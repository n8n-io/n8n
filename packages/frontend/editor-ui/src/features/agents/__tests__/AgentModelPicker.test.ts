import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { configure, screen, waitFor, within } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import AgentModelPicker from '../components/model-picker/AgentModelPicker.vue';
import {
	FAKE_MODEL_CATALOG,
	FAKE_MODEL_CONNECTIONS,
} from '../components/model-picker/fakeModelCatalog';
import {
	filterModels,
	formatContext,
	formatCost,
	getPresets,
	pickConnection,
	type ModelPickerModel,
} from '../components/model-picker/modelPicker.utils';

configure({ testIdAttribute: 'data-testid' });

function model(overrides: Partial<ModelPickerModel> & { id: string }): ModelPickerModel {
	return {
		name: overrides.id,
		lab: overrides.id.split('/')[0],
		providers: ['openrouter'],
		cost: { input: 1, output: 1 },
		limits: { context: 100_000 },
		...overrides,
	};
}

describe('modelPicker.utils', () => {
	it('should suggest a recommended, a cheaper, and a largest-context model', () => {
		const models = [
			model({ id: 'anthropic/claude-sonnet-5-5', cost: { input: 2, output: 10 } }),
			model({ id: 'anthropic/claude-haiku-5-5', cost: { input: 0.1, output: 0.5 } }),
			model({ id: 'acme/tiny', cost: { input: 0.01, output: 0.01 } }),
			model({ id: 'acme/free', cost: { input: 0, output: 0 } }),
			model({ id: 'acme/huge', limits: { context: 2_000_000 } }),
		];

		expect(getPresets(models).map(({ id, model: preset }) => [id, preset.id])).toEqual([
			['recommended', 'anthropic/claude-sonnet-5-5'],
			// The same lab wins over a cheaper model from another lab.
			['cheaper', 'anthropic/claude-haiku-5-5'],
			['largestContext', 'acme/huge'],
		]);
		expect(getPresets([])).toEqual([]);
	});

	it('should filter by search text, features, and input cost', () => {
		const models = [
			model({ id: 'acme/vision-pro', vision: true, cost: { input: 3, output: 9 } }),
			model({ id: 'acme/thinker', reasoning: true, cost: { input: 0.5, output: 2 } }),
			model({ id: 'acme/free', cost: { input: 0, output: 0 } }),
		];
		const ids = (filters: Parameters<typeof filterModels>[1]) =>
			filterModels(models, filters).map(({ id }) => id);

		expect(ids({ search: ' THINK ', features: [], cost: 'any' })).toEqual(['acme/thinker']);
		expect(ids({ search: '', features: ['vision'], cost: 'any' })).toEqual(['acme/vision-pro']);
		expect(ids({ search: '', features: [], cost: 'upTo1' })).toEqual(['acme/thinker', 'acme/free']);
		expect(ids({ search: '', features: [], cost: 'free' })).toEqual(['acme/free']);
	});

	it('should keep the current connection, then prefer a credential over Gateway credits', () => {
		const sonnet = model({ id: 'anthropic/claude-sonnet-5-5', providers: ['anthropic'] });

		expect(pickConnection(sonnet, FAKE_MODEL_CONNECTIONS)?.id).toBe('anthropic-account');
		expect(pickConnection(sonnet, FAKE_MODEL_CONNECTIONS, 'gateway')?.id).toBe('gateway');
		expect(pickConnection(sonnet, [])).toBeUndefined();
	});

	it('should format context sizes and prices', () => {
		expect(formatContext(1_000_000)).toBe('1M');
		expect(formatContext(200_000)).toBe('200K');
		expect(formatCost(0.045)).toBe('$0.045');
		expect(formatCost(10)).toBe('$10');
	});

	it('should ship a fake catalog where each model has a price, a context size, and a provider', () => {
		expect(FAKE_MODEL_CATALOG.length).toBeGreaterThan(0);
		for (const entry of FAKE_MODEL_CATALOG) {
			expect(entry.cost?.input).toBeTypeOf('number');
			expect(entry.limits?.context).toBeGreaterThan(0);
			expect(entry.providers.length).toBeGreaterThan(0);
		}
	});
});

describe('AgentModelPicker', () => {
	const renderComponent = createComponentRenderer(AgentModelPicker, {
		pinia: createTestingPinia(),
		global: { stubs: { ModelSelectorTriggerIcon: true } },
	});

	it('should select a suggested model and show its credential on the trigger', async () => {
		const user = userEvent.setup();
		renderComponent();

		const trigger = screen.getByTestId('agent-model-picker-trigger');
		expect(trigger).toHaveTextContent('Select model');

		await user.click(trigger);
		const dialog = await screen.findByRole('dialog');
		const suggested = within(dialog).getByRole('listbox', { name: 'Suggested models' });
		expect(within(suggested).getAllByRole('option')).toHaveLength(3);

		await user.click(within(suggested).getByRole('option', { name: /Recommended/ }));

		expect(trigger).toHaveTextContent('Claude Sonnet 5.5');
		expect(screen.getByTestId('agent-model-picker-connection')).toHaveTextContent(
			'Anthropic account',
		);
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	});

	it('should list all models and filter them by search text', async () => {
		const user = userEvent.setup();
		renderComponent();

		await user.click(screen.getByTestId('agent-model-picker-trigger'));
		const dialog = await screen.findByRole('dialog');
		await user.click(within(dialog).getByTestId('agent-model-picker-show-all'));

		const all = within(dialog).getByRole('listbox', { name: 'All models' });
		const options = within(all).getAllByRole('option');
		const total = options.length;
		// The suggested models come first, in the order of the suggestions.
		expect(options[0]).toHaveTextContent('Claude Sonnet 5.5');
		expect(options[1]).toHaveTextContent('Claude Haiku 5.5');

		await user.type(within(dialog).getByPlaceholderText('Search all models…'), 'gemini');

		// The search reads the model name and the model id.
		expect(within(all).getAllByRole('option').length).toBeLessThan(total);
		expect(within(all).getByRole('option', { name: /Gemini 4 Argon/ })).toBeVisible();
		expect(within(all).queryByRole('option', { name: /Claude Sonnet 5\.5/ })).toBeNull();

		await user.type(within(dialog).getByPlaceholderText('Search all models…'), ' no such model');
		expect(within(dialog).getByText('No models found')).toBeVisible();
	});

	it('should hide the models of a provider that the user turns off', async () => {
		const user = userEvent.setup();
		renderComponent();

		await user.click(screen.getByTestId('agent-model-picker-trigger'));
		const dialog = await screen.findByRole('dialog');
		const providers = within(dialog).getByTestId('agent-model-picker-providers');
		expect(providers).toHaveTextContent('Providers · 3');
		const showAll = within(dialog).getByTestId('agent-model-picker-show-all');
		const before = showAll.textContent;

		await user.click(providers);
		await user.click(await screen.findByRole('menuitemcheckbox', { name: /Gateway credits/ }));

		expect(providers).toHaveTextContent('Providers · 2');
		expect(showAll.textContent).not.toBe(before);

		// A provider row opens its credentials. Its checkbox turns the provider off.
		const anthropic = screen.getByRole('menuitem', { name: /Anthropic/ });
		await user.click(within(anthropic).getByTestId('agent-model-picker-provider-checkbox'));

		expect(providers).toHaveTextContent('Providers · 1');
	});
});
