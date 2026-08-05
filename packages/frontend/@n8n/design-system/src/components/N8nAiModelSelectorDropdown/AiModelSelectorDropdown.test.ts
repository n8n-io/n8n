import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';
import { vi } from 'vitest';

import type { AiModelSelectorMenuItem } from './AiModelSelectorDropdown.types';
import N8nAiModelSelectorDropdown from './AiModelSelectorDropdown.vue';

const baseItems: AiModelSelectorMenuItem[] = [
	{
		id: 'openai',
		label: 'OpenAI',
		children: [
			{
				id: 'openai::gpt-4.1',
				label: 'GPT-4.1',
				data: {
					fullName: 'OpenAI GPT-4.1',
					description: 'A general-purpose model.',
				},
			},
		],
	},
	{
		id: 'anthropic::claude-sonnet',
		label: 'Claude Sonnet 4',
		data: {
			fullName: 'Claude Sonnet 4',
			parts: ['Anthropic', 'Claude Sonnet 4'],
		},
	},
];

const defaultProps = {
	items: baseItems,
	selectedLabel: 'GPT-4.1',
	noMatchLabel: 'No models found',
	dataTestId: 'ai-model-selector',
	credentialDataTestId: 'ai-model-selector-credential',
};

describe('N8nAiModelSelectorDropdown', () => {
	it('renders selected model and credential in the trigger', () => {
		const { getByTestId, getByText } = render(N8nAiModelSelectorDropdown, {
			props: {
				...defaultProps,
				selectedCredentialName: 'Production OpenAI credential',
			},
			slots: {
				'trigger-leading': '<span data-test-id="trigger-leading">🤖</span>',
			},
		});

		expect(getByTestId('ai-model-selector')).toBeVisible();
		expect(getByTestId('trigger-leading')).toBeVisible();
		expect(getByText('GPT-4.1')).toBeVisible();
		expect(getByTestId('ai-model-selector-credential')).toHaveTextContent(
			'Production OpenAI credential',
		);
	});

	it('shows the fallback missing credentials state when credentials are missing', () => {
		const { getByText, queryByTestId } = render(N8nAiModelSelectorDropdown, {
			props: {
				...defaultProps,
				selectedCredentialName: 'Production OpenAI credential',
				credentialsMissing: true,
			},
		});

		expect(getByText('Credentials missing')).toBeVisible();
		expect(queryByTestId('ai-model-selector-credential')).not.toBeInTheDocument();
	});

	it('truncates selected model and credential names longer than 30 characters', () => {
		const { getByText, getByTestId } = render(N8nAiModelSelectorDropdown, {
			props: {
				...defaultProps,
				selectedLabel: 'This is a selected model name that is long',
				selectedCredentialName: 'Production OpenAI credential name',
			},
		});

		expect(getByText('This is a selected model …long')).toBeVisible();
		expect(getByTestId('ai-model-selector-credential')).toHaveTextContent(
			'Production OpenAI credent…name',
		);
	});

	it('renders flattened search result labels with their path context', async () => {
		const { getByTestId, getByText } = render(N8nAiModelSelectorDropdown, {
			props: defaultProps,
		});

		await userEvent.click(getByTestId('ai-model-selector'));

		await waitFor(() => expect(getByText('Anthropic')).toBeVisible());
		expect(getByText('Claude Sonnet 4')).toBeVisible();
	});

	it('emits select and search events', async () => {
		const { getByTestId, getByText, emitted } = render(N8nAiModelSelectorDropdown, {
			props: {
				...defaultProps,
				onSearch: vi.fn(),
			},
		});

		await userEvent.click(getByTestId('ai-model-selector'));
		await userEvent.click(await waitFor(() => getByText('Claude Sonnet 4')));

		expect(emitted('select')).toEqual([['anthropic::claude-sonnet']]);

		await userEvent.click(getByTestId('ai-model-selector'));
		const searchInput = await waitFor(() => document.querySelector('input'));
		expect(searchInput).toBeInTheDocument();
		await userEvent.type(searchInput as HTMLInputElement, 'gpt');

		await waitFor(() => expect(emitted('search')?.at(-1)).toEqual(['gpt']));
	});
});
