import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { configure, screen, waitFor, within } from '@testing-library/vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
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
import { useModelPickerScenario } from '../components/model-picker/modelPickerScenarios';
import ModelPickerScenarioSwitch from '../components/model-picker/ModelPickerScenarioSwitch.vue';

configure({ testIdAttribute: 'data-testid' });

function model(overrides: Partial<ModelPickerModel> & { id: string }): ModelPickerModel {
	return {
		name: overrides.id,
		lab: overrides.id.split('/')[0],
		providers: ['openrouter'],
		textOutput: true,
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
			model({ id: 'openai/gpt-pro', cost: { input: 2, output: 8 } }),
			model({ id: 'meta/llama', cost: { input: 0.5, output: 1 } }),
			model({ id: 'acme/free', cost: { input: 0, output: 0 } }),
			model({ id: 'meta/llama-long', limits: { context: 9_000_000 } }),
			model({ id: 'google/gemini-long', limits: { context: 2_000_000 } }),
		];

		expect(getPresets(models).map(({ id, model: preset }) => [id, preset.id])).toEqual([
			['recommended', 'anthropic/claude-sonnet-5-5'],
			// Another lab, at most half the price. The first in catalog order wins.
			['cheaper', 'meta/llama'],
			// A third lab, even though Meta has a longer context.
			['largestContext', 'google/gemini-long'],
		]);
		expect(getPresets([])).toEqual([]);
	});

	it('should filter by search text, features, and input cost', () => {
		const models = [
			model({ id: 'acme/vision-pro', vision: true, cost: { input: 3, output: 9 } }),
			model({ id: 'acme/painter', imageOutput: true, cost: { input: 2, output: 9 } }),
			model({ id: 'acme/thinker', reasoning: true, cost: { input: 0.5, output: 2 } }),
			model({ id: 'acme/free', cost: { input: 0, output: 0 } }),
		];
		const ids = (filters: Parameters<typeof filterModels>[1]) =>
			filterModels(models, filters).map(({ id }) => id);

		expect(ids({ search: ' THINK ', features: [], cost: 'any' })).toEqual(['acme/thinker']);
		// Image covers both image input and image generation.
		expect(ids({ search: '', features: ['image'], cost: 'any' })).toEqual([
			'acme/vision-pro',
			'acme/painter',
		]);
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

	it('should ship a large fake catalog where each model has a provider', () => {
		expect(FAKE_MODEL_CATALOG.length).toBeGreaterThan(1000);
		for (const entry of FAKE_MODEL_CATALOG) {
			expect(entry.providers.length).toBeGreaterThan(0);
			if (entry.cost) expect(entry.cost.input).toBeTypeOf('number');
		}
	});

	it('should map models to the providers that serve them', () => {
		const providersOf = (id: string) =>
			FAKE_MODEL_CATALOG.find((entry) => entry.id === id)?.providers;
		// A maker's own key runs its models. Gateways and clouds carry many makers.
		expect(providersOf('anthropic/claude-sonnet-5-5')).toEqual(
			expect.arrayContaining(['anthropic', 'aws-bedrock', 'openrouter']),
		);
		// An open-weight model has no maker key, only hosts.
		expect(providersOf('meta/llama-3.1-70b')).not.toContain('anthropic');
		expect(providersOf('meta/llama-3.1-70b')).toEqual(
			expect.arrayContaining(['groq', 'openrouter']),
		);
		// An OpenRouter variant stays on OpenRouter.
		expect(providersOf('google/gemini-4-carbon:batch')).toEqual(['openrouter']);
	});

	it('should suggest only models an agent can run', () => {
		const presets = getPresets([
			model({ id: 'anthropic/claude-sonnet-5-5', cost: { input: 3, output: 15 } }),
			model({
				id: 'acme/embed',
				textOutput: false,
				embeddings: true,
				cost: { input: 0.01, output: 0 },
			}),
			model({ id: 'acme/huge:batch', variant: true, limits: { context: 9_000_000 } }),
			model({ id: 'acme/large', limits: { context: 2_000_000 } }),
		]);
		expect(presets.map(({ model: preset }) => preset.id)).toEqual([
			'anthropic/claude-sonnet-5-5',
			'acme/large',
		]);
	});
});

describe('AgentModelPicker', () => {
	const renderComponent = createComponentRenderer(AgentModelPicker, {
		pinia: createTestingPinia(),
		global: { stubs: { ModelSelectorTriggerIcon: true } },
	});
	const renderSwitch = createComponentRenderer(ModelPickerScenarioSwitch);

	it('should select a suggested model and show its credential on the trigger', async () => {
		const user = userEvent.setup();
		renderComponent();

		const trigger = screen.getByTestId('agent-model-picker-trigger');
		// With providers connected, the agent starts on the recommended model.
		expect(trigger).toHaveTextContent('Claude Sonnet 5.5');

		await user.click(trigger);
		const dialog = await screen.findByRole('dialog');
		const suggested = within(dialog).getByRole('listbox', { name: 'Suggested models' });
		expect(within(suggested).getAllByRole('option')).toHaveLength(3);

		// Each suggestion is from a different lab. Cheaper is an open-weight model here.
		await user.click(within(suggested).getByRole('option', { name: /Cheaper/ }));
		expect(trigger).toHaveTextContent('Llama 5 405B');
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

		await user.click(trigger);
		await user.click(
			within(await screen.findByRole('dialog')).getByRole('option', { name: /Recommended/ }),
		);

		expect(trigger).toHaveTextContent('Claude Sonnet 5.5');
		// Llama ran on OpenRouter, which also runs Sonnet, so the credential stays.
		expect(screen.getByTestId('agent-model-picker-connection')).toHaveTextContent(
			'OpenRouter account',
		);
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

		// Both lists mark the selected model with the tick of the menus.
		await user.click(trigger);
		const reopened = await screen.findByRole('dialog');
		const selected = within(reopened).getByRole('option', { name: /Recommended/ });
		expect(selected).toHaveAttribute('aria-selected', 'true');
		expect(within(selected).getByTestId('agent-model-picker-selected')).toBeInTheDocument();
		const cheaper = within(reopened).getByRole('option', { name: /Cheaper/ });
		expect(within(cheaper).queryByTestId('agent-model-picker-selected')).toBeNull();

		await user.click(within(reopened).getByTestId('agent-model-picker-show-all'));
		const all = within(reopened).getByRole('listbox', { name: 'All models' });
		const selectedInAll = within(all).getByRole('option', { name: /Claude Sonnet 5\.5/ });
		expect(within(selectedInAll).getByTestId('agent-model-picker-selected')).toBeInTheDocument();
	});

	describe('prototype scenarios', () => {
		afterEach(() => {
			const { scenario, skipKeyCheck } = useModelPickerScenario();
			scenario.value = 'connected';
			skipKeyCheck.value = true;
		});

		it('should start empty and list the models of the first provider connected', async () => {
			const user = userEvent.setup();
			useModelPickerScenario().scenario.value = 'empty';
			renderComponent();
			const credentialsStore = useCredentialsStore();
			vi.mocked(credentialsStore.createNewCredential).mockResolvedValue({
				id: 'mistral-credential',
				name: 'Mistral account',
				type: 'mistralCloudApi',
			} as ICredentialsResponse);

			await user.click(screen.getByTestId('agent-model-picker-trigger'));
			const dialog = await screen.findByRole('dialog');
			const empty = within(dialog).getByTestId('agent-model-picker-empty');
			expect(within(dialog).queryByTestId('agent-model-picker-show-all')).toBeNull();

			await user.click(within(empty).getByRole('button', { name: /Create credential/ }));
			const choices = within(dialog).getByRole('listbox', { name: 'Choose a provider' });
			await user.click(within(choices).getByRole('option', { name: /Mistral/ }));
			// The form loads on first use. The first load in a run can take a moment.
			await within(dialog).findByTestId(
				'agent-model-picker-credential-form',
				{},
				{ timeout: 10_000 },
			);
			await user.click(within(dialog).getByTestId('agent-model-picker-credential-save'));

			// Back on the first page, with only the models Mistral serves.
			const showAll = await within(dialog).findByTestId('agent-model-picker-show-all');
			const mistralModels = FAKE_MODEL_CATALOG.filter((entry) =>
				entry.providers.includes('mistral'),
			);
			expect(showAll).toHaveTextContent(`${mistralModels.length} models available`);
			expect(within(dialog).getByTestId('agent-model-picker-providers')).toHaveTextContent(
				'Providers · 1',
			);
		});

		it('should start again when the scenario changes', async () => {
			const user = userEvent.setup();
			renderComponent();
			const trigger = screen.getByTestId('agent-model-picker-trigger');

			await user.click(trigger);
			const dialog = await screen.findByRole('dialog');
			await user.click(within(dialog).getByRole('option', { name: /Recommended/ }));
			expect(trigger).toHaveTextContent('Claude Sonnet 5.5');

			useModelPickerScenario().scenario.value = 'empty';

			await waitFor(() => expect(trigger).toHaveTextContent('Select model'));
			await user.click(trigger);
			expect(await screen.findByTestId('agent-model-picker-empty')).toBeVisible();
		});

		it('should offer the current picker first, then the two new-picker scenarios', async () => {
			const user = userEvent.setup();
			renderSwitch();
			const { scenario, showsCurrentPicker } = useModelPickerScenario();

			await user.click(screen.getByTestId('agent-model-picker-scenario'));
			const items = await screen.findAllByRole('menuitem');
			expect(items.map((item) => item.textContent?.trim())).toEqual(
				expect.arrayContaining([
					'Current picker',
					'New picker · No credentials',
					'New picker · Credits and keys',
				]),
			);

			await user.click(screen.getByRole('menuitem', { name: 'Current picker' }));
			expect(scenario.value).toBe('current');
			expect(showsCurrentPicker.value).toBe(true);
		});
	});

	it('should show a model picked from the full list on the first page', async () => {
		const user = userEvent.setup();
		renderComponent();
		const trigger = screen.getByTestId('agent-model-picker-trigger');

		await user.click(trigger);
		const dialog = await screen.findByRole('dialog');
		await user.click(within(dialog).getByTestId('agent-model-picker-show-all'));
		await user.type(within(dialog).getByPlaceholderText('Search all models…'), 'Gemini 4 Argon');
		const all = within(dialog).getByRole('listbox', { name: 'All models' });
		// The model comes first, before its dated snapshots.
		await user.click(within(all).getAllByRole('option', { name: /Gemini 4 Argon/ })[0]);
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

		await user.click(trigger);
		const reopened = await screen.findByRole('dialog');
		const suggested = within(reopened).getByRole('listbox', { name: 'Suggested models' });
		const options = within(suggested).getAllByRole('option');
		// The selected model leads the page, above the three suggestions.
		expect(options).toHaveLength(4);
		expect(options[0]).toHaveTextContent('Selected');
		expect(options[0]).toHaveTextContent('Gemini 4 Argon');
		expect(within(options[0]).getByTestId('agent-model-picker-selected')).toBeInTheDocument();
	});

	it('should sort the suggested models by a column', async () => {
		const user = userEvent.setup();
		renderComponent();

		await user.click(screen.getByTestId('agent-model-picker-trigger'));
		const dialog = await screen.findByRole('dialog');
		const suggested = within(dialog).getByRole('listbox', { name: 'Suggested models' });
		const names = () =>
			within(suggested)
				.getAllByRole('option')
				.map((option) => option.textContent);
		const [sortInput] = within(dialog).getAllByTestId('agent-model-picker-sort-input');

		// High to low, then low to high, then the order of the suggestions again.
		await user.click(sortInput);
		expect(names()[0]).toContain('Claude Sonnet 5.5');
		await user.click(sortInput);
		expect(names()[0]).toContain('Llama 5 405B');
		await user.click(sortInput);
		expect(names()[0]).toContain('Recommended');
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
		// A long catalog draws a page at a time. Scrolling to the end draws the next page.
		expect(total).toBe(100);
		// The suggested models come first, in the order of the suggestions.
		expect(options[0]).toHaveTextContent('Claude Sonnet 5.5');
		expect(options[1]).toHaveTextContent('Llama 5 405B');
		expect(options[2]).toHaveTextContent('Gemini 3.5 Pro');

		await user.type(within(dialog).getByPlaceholderText('Search all models…'), 'gemini');

		// The search reads the model name and the model id.
		expect(within(all).getAllByRole('option').length).toBeLessThan(total);
		expect(within(all).getAllByRole('option', { name: /Gemini 4 Argon/ })[0]).toBeVisible();
		expect(within(all).queryByRole('option', { name: /Claude Sonnet 5\.5/ })).toBeNull();

		await user.type(within(dialog).getByPlaceholderText('Search all models…'), ' no such model');
		const noMatch = within(dialog).getByTestId('agent-model-picker-no-match');
		expect(noMatch).toHaveTextContent('No models match');

		// Clearing the filters brings the whole list back.
		await user.click(within(noMatch).getByRole('button', { name: 'Clear filters' }));
		expect(within(dialog).getByPlaceholderText('Search all models…')).toHaveValue('');
		const restored = within(dialog).getByRole('listbox', { name: 'All models' });
		expect(within(restored).getAllByRole('option')).toHaveLength(total);
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

	it('should create a credential in the dialog and use it for the selected model', async () => {
		const user = userEvent.setup();
		renderComponent();
		const credentialsStore = useCredentialsStore();
		vi.mocked(credentialsStore.createNewCredential).mockResolvedValue({
			id: 'new-credential',
			name: 'Anthropic · New',
			type: 'anthropicApi',
		} as ICredentialsResponse);

		await user.click(screen.getByTestId('agent-model-picker-trigger'));
		const picker = await screen.findByRole('dialog');
		await user.click(within(picker).getByRole('option', { name: /Recommended/ }));
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

		// The credential menu of the model ends with a way to add one.
		await user.click(screen.getByTestId('agent-model-picker-connection'));
		await user.click(await screen.findByRole('menuitem', { name: 'Create credential' }));

		// Every provider is offered. The ones that serve the model come first.
		const dialog = await screen.findByRole('dialog');
		const choices = within(dialog).getByRole('listbox', { name: 'Choose a provider' });
		const [first] = within(choices).getAllByRole('option');
		expect(first).toHaveTextContent('Anthropic');
		await user.click(first);
		expect(within(dialog).getByText('Connect to Anthropic')).toBeVisible();
		expect(
			await within(dialog).findByTestId(
				'agent-model-picker-credential-form',
				{},
				{ timeout: 10_000 },
			),
		).toBeVisible();

		await user.click(within(dialog).getByTestId('agent-model-picker-credential-save'));

		expect(credentialsStore.createNewCredential).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'anthropicApi' }),
			undefined,
			undefined,
			{ skipStoreUpdate: true },
		);
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect(screen.getByTestId('agent-model-picker-connection')).toHaveTextContent(
			'Anthropic · New',
		);
	});

	it('should ask for a provider when the Providers menu creates a credential', async () => {
		const user = userEvent.setup();
		renderComponent();

		await user.click(screen.getByTestId('agent-model-picker-trigger'));
		const dialog = await screen.findByRole('dialog');
		await user.click(within(dialog).getByTestId('agent-model-picker-providers'));
		const createItems = await screen.findAllByRole('menuitem', { name: 'Create credential' });
		await user.click(createItems[createItems.length - 1]);

		// The search takes focus and narrows the providers by name.
		const search = within(dialog).getByPlaceholderText('Search providers…');
		await waitFor(() => expect(search).toHaveFocus());
		await user.keyboard('gro');
		const choices = within(dialog).getByRole('listbox', { name: 'Choose a provider' });
		expect(within(choices).getAllByRole('option')).toHaveLength(1);
		await user.keyboard('zz');
		expect(within(dialog).getByText('No providers found')).toBeVisible();
		await user.keyboard('{Backspace}{Backspace}');
		await user.click(within(dialog).getByRole('option', { name: /Groq/ }));
		expect(within(dialog).getByText('Connect to Groq')).toBeVisible();

		// Back goes to the provider choice, then to the models.
		await user.click(within(dialog).getByRole('button', { name: /back/i }));
		expect(within(dialog).getByRole('listbox', { name: 'Choose a provider' })).toBeVisible();
		await user.click(within(dialog).getByRole('button', { name: /back/i }));
		expect(within(dialog).getByTestId('agent-model-picker-show-all')).toBeVisible();
	});
});
