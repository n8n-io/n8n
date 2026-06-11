import userEvent from '@testing-library/user-event';
import type { ApiKeyScope } from '@n8n/permissions';

import { createComponentRenderer } from '@/__tests__/render';
import ApiKeyScopes from './ApiKeyScopes.vue';

const availableScopes: ApiKeyScope[] = [
	'workflow:create',
	'workflow:read',
	'workflow:list',
	'execution:read',
	'user:read',
	'user:create',
];

const readOnlyScopes: ApiKeyScope[] = [
	'workflow:read',
	'workflow:list',
	'execution:read',
	'user:read',
];

const renderComponent = createComponentRenderer(ApiKeyScopes);

const getRadioInput = (element: HTMLElement) =>
	element.querySelector<HTMLInputElement>('input[type="radio"]') as HTMLInputElement;

describe('ApiKeyScopes', () => {
	it('selects "All" when every scope is selected and still shows the scope tree', () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: availableScopes, availableScopes },
		});

		expect(getRadioInput(getByTestId('scopes-mode-all'))).toBeChecked();
		expect(getByTestId('scopes-search')).toBeInTheDocument();
		expect(getByTestId('scope-group-workflowsAndExecutions')).toBeInTheDocument();
	});

	it('selects "Read only" when exactly the read scopes are selected', () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: readOnlyScopes, availableScopes },
		});

		expect(getRadioInput(getByTestId('scopes-mode-read-only'))).toBeChecked();
	});

	it('selects "Custom" and shows the scope tree for partial selections', () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: ['workflow:read'], availableScopes },
		});

		expect(getRadioInput(getByTestId('scopes-mode-custom'))).toBeChecked();
		expect(getByTestId('scopes-search')).toBeInTheDocument();
		expect(getByTestId('scope-group-workflowsAndExecutions')).toBeInTheDocument();
		expect(getByTestId('scope-group-members')).toBeInTheDocument();
	});

	it('emits all scopes when switching to "All"', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { modelValue: ['workflow:read'], availableScopes },
		});

		await userEvent.click(getRadioInput(getByTestId('scopes-mode-all')));

		expect(emitted('update:modelValue').at(-1)).toEqual([availableScopes]);
	});

	it('emits read scopes when switching to "Read only"', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { modelValue: availableScopes, availableScopes },
		});

		await userEvent.click(getRadioInput(getByTestId('scopes-mode-read-only')));

		expect(emitted('update:modelValue').at(-1)).toEqual([readOnlyScopes]);
	});

	it('keeps the current selection when switching to "Custom"', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { modelValue: availableScopes, availableScopes },
		});

		await userEvent.click(getRadioInput(getByTestId('scopes-mode-custom')));

		expect(emitted('update:modelValue')).toBeUndefined();
		expect(getRadioInput(getByTestId('scopes-mode-custom'))).toBeChecked();
	});

	it('expands a group and toggles a single scope', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { modelValue: ['workflow:read'] as ApiKeyScope[], availableScopes },
		});

		await userEvent.click(getByTestId('scope-group-toggle-workflowsAndExecutions'));
		await userEvent.click(getByTestId('scope-checkbox-workflow:create'));

		expect(emitted('update:modelValue').at(-1)).toEqual([['workflow:create', 'workflow:read']]);
	});

	it('selects a whole group through the group checkbox', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { modelValue: [] as ApiKeyScope[], availableScopes },
		});

		await userEvent.click(getByTestId('scope-group-members'));

		expect(emitted('update:modelValue').at(-1)).toEqual([['user:read', 'user:create']]);
	});

	it('marks a partially selected group as indeterminate', () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: ['workflow:read'] as ApiKeyScope[], availableScopes },
		});

		expect(getByTestId('scope-group-workflowsAndExecutions')).toHaveAttribute(
			'data-state',
			'indeterminate',
		);
	});

	it('filters scopes by search term and auto-expands matches', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { modelValue: [] as ApiKeyScope[], availableScopes },
		});

		await userEvent.type(getByTestId('scopes-search'), 'user');

		expect(queryByTestId('scope-group-workflowsAndExecutions')).not.toBeInTheDocument();
		expect(getByTestId('scope-checkbox-user:read')).toBeInTheDocument();
		expect(getByTestId('scope-checkbox-user:create')).toBeInTheDocument();
	});

	it('filters by scope name only, ignoring group label matches', async () => {
		// Typing "workflow" must not bring in execution scopes just because they share
		// the "Workflow and executions" group label.
		const { getByTestId, queryByTestId } = renderComponent({
			props: { modelValue: [] as ApiKeyScope[], availableScopes },
		});

		await userEvent.type(getByTestId('scopes-search'), 'workflow');

		expect(getByTestId('scope-checkbox-workflow:create')).toBeInTheDocument();
		expect(queryByTestId('scope-checkbox-execution:read')).not.toBeInTheDocument();
	});

	it('renders "N of M scopes selected" in the count header', () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: ['workflow:read', 'user:read'] as ApiKeyScope[], availableScopes },
		});

		expect(getByTestId('scopes-count')).toHaveTextContent('2 of 6 scopes selected');
	});

	it('updates the count after toggling a scope', async () => {
		const { getByTestId, rerender } = renderComponent({
			props: { modelValue: ['workflow:read'] as ApiKeyScope[], availableScopes },
		});

		expect(getByTestId('scopes-count')).toHaveTextContent('1 of 6 scopes selected');

		await rerender({ modelValue: availableScopes, availableScopes });

		expect(getByTestId('scopes-count')).toHaveTextContent('6 of 6 scopes selected');
	});

	it('collapses the tree via the tree-header toggle', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { modelValue: availableScopes, availableScopes },
		});

		expect(getByTestId('scopes-search')).toBeInTheDocument();

		await userEvent.click(getByTestId('scopes-tree-toggle'));

		expect(queryByTestId('scopes-search')).not.toBeInTheDocument();
		expect(queryByTestId('scope-group-workflowsAndExecutions')).not.toBeInTheDocument();
		expect(getByTestId('scopes-count')).toBeInTheDocument();
	});

	it('keeps Custom selected when a parent-driven selection happens to match Read only', async () => {
		const { getByTestId, rerender } = renderComponent({
			props: { modelValue: ['workflow:read'] as ApiKeyScope[], availableScopes },
		});

		await userEvent.click(getRadioInput(getByTestId('scopes-mode-custom')));
		expect(getRadioInput(getByTestId('scopes-mode-custom'))).toBeChecked();

		// Parent pushes a selection that happens to equal the read-only set.
		// The radio must NOT silently flip away from Custom.
		await rerender({ modelValue: readOnlyScopes, availableScopes });

		expect(getRadioInput(getByTestId('scopes-mode-custom'))).toBeChecked();
		expect(getRadioInput(getByTestId('scopes-mode-read-only'))).not.toBeChecked();
	});

	it('moves the radio to Custom when selection drifts away from a preset', async () => {
		const { getByTestId, rerender } = renderComponent({
			props: { modelValue: availableScopes, availableScopes },
		});

		expect(getRadioInput(getByTestId('scopes-mode-all'))).toBeChecked();

		await rerender({ modelValue: ['workflow:read'] as ApiKeyScope[], availableScopes });

		expect(getRadioInput(getByTestId('scopes-mode-custom'))).toBeChecked();
	});
});
