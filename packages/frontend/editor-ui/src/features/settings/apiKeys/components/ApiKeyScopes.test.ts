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

describe('ApiKeyScopes', () => {
	it('selects "All" when every scope is selected and collapses the scope tree by default', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { modelValue: availableScopes, availableScopes },
		});

		expect(getByTestId('scopes-mode-all')).toBeChecked();
		expect(getByTestId('scopes-count')).toBeInTheDocument();
		expect(queryByTestId('scopes-search')).not.toBeInTheDocument();
		expect(queryByTestId('scope-group-workflowsAndExecutions')).not.toBeInTheDocument();
	});

	it('selects "Read only" when exactly the read scopes are selected', () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: readOnlyScopes, availableScopes },
		});

		expect(getByTestId('scopes-mode-read-only')).toBeChecked();
	});

	it('selects "Custom" and shows the scope tree for partial selections', () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: ['workflow:read'], availableScopes },
		});

		expect(getByTestId('scopes-mode-custom')).toBeChecked();
		expect(getByTestId('scopes-search')).toBeInTheDocument();
		expect(getByTestId('scope-group-workflowsAndExecutions')).toBeInTheDocument();
		expect(getByTestId('scope-group-members')).toBeInTheDocument();
	});

	it('emits all scopes when switching to "All"', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { modelValue: ['workflow:read'], availableScopes },
		});

		await userEvent.click(getByTestId('scopes-mode-all'));

		expect(emitted('update:modelValue').at(-1)).toEqual([availableScopes]);
	});

	it('emits read scopes when switching to "Read only"', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { modelValue: availableScopes, availableScopes },
		});

		await userEvent.click(getByTestId('scopes-mode-read-only'));

		expect(emitted('update:modelValue').at(-1)).toEqual([readOnlyScopes]);
	});

	it('clears the selection when switching to "Custom"', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { modelValue: availableScopes, availableScopes },
		});

		await userEvent.click(getByTestId('scopes-mode-custom'));

		expect(emitted('update:modelValue').at(-1)).toEqual([[]]);
		expect(getByTestId('scopes-mode-custom')).toBeChecked();
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
		// A partial selection starts in Custom, which opens the tree by default.
		const { getByTestId, queryByTestId } = renderComponent({
			props: { modelValue: ['workflow:read'] as ApiKeyScope[], availableScopes },
		});

		expect(getByTestId('scopes-search')).toBeInTheDocument();

		await userEvent.click(getByTestId('scopes-tree-toggle'));

		expect(queryByTestId('scopes-search')).not.toBeInTheDocument();
		expect(queryByTestId('scope-group-workflowsAndExecutions')).not.toBeInTheDocument();
		expect(getByTestId('scopes-count')).toBeInTheDocument();
	});

	it('keeps Custom selected when the user explicitly picks it even if selection matches Read only', async () => {
		// Start in "All" so clicking Custom is a real transition that fires
		// ElRadioGroup's @change handler (and not a re-click no-op).
		const { getByTestId, rerender } = renderComponent({
			props: { modelValue: availableScopes, availableScopes },
		});

		await userEvent.click(getByTestId('scopes-mode-custom'));
		expect(getByTestId('scopes-mode-custom')).toBeChecked();

		// Parent pushes a selection that happens to equal the read-only set.
		// The radio must NOT silently flip away from Custom because the user
		// explicitly picked it.
		await rerender({ modelValue: readOnlyScopes, availableScopes });

		expect(getByTestId('scopes-mode-custom')).toBeChecked();
		expect(getByTestId('scopes-mode-read-only')).not.toBeChecked();
	});

	it('recovers from an initial Custom inference once props hydrate to match All', async () => {
		// Modal mounts with empty arrays (store still loading). Both modelValue
		// and availableScopes are []; inferSelectionMode returns 'custom'.
		const { getByTestId, queryByTestId, rerender } = renderComponent({
			props: { modelValue: [] as ApiKeyScope[], availableScopes: [] as ApiKeyScope[] },
		});

		expect(getByTestId('scopes-mode-custom')).toBeChecked();
		// Custom starts with the tree open.
		expect(getByTestId('scopes-search')).toBeInTheDocument();

		// Store hydrates: parent fills availableScopes and pre-selects everything.
		// User never picked Custom, so the radio must flip to All.
		await rerender({ modelValue: availableScopes, availableScopes });

		expect(getByTestId('scopes-mode-all')).toBeChecked();
		expect(getByTestId('scopes-mode-custom')).not.toBeChecked();
		// The programmatic mode flip must also collapse the tree, not just move the radio.
		expect(queryByTestId('scopes-search')).not.toBeInTheDocument();
	});

	it('toggling a group while searching only affects scopes in that group, not the visible subset', async () => {
		// Workflow group has 4 scopes total; search narrows to 2 of them.
		const { getByTestId, emitted } = renderComponent({
			props: { modelValue: [] as ApiKeyScope[], availableScopes },
		});

		await userEvent.type(getByTestId('scopes-search'), 'workflow:re');

		// Group label is the original group, indeterminate state and toggling
		// must operate on the full group (4 scopes), not just the 2 visible.
		await userEvent.click(getByTestId('scope-group-workflowsAndExecutions'));

		// All 4 workflow-group scopes are selected, not just the visible 2.
		expect(emitted('update:modelValue').at(-1)).toEqual([
			['workflow:create', 'workflow:read', 'workflow:list', 'execution:read'],
		]);
	});

	it('hides per-group chevrons while searching to avoid silent expand-state mutations', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { modelValue: [] as ApiKeyScope[], availableScopes },
		});

		expect(getByTestId('scope-group-toggle-workflowsAndExecutions')).toBeInTheDocument();

		await userEvent.type(getByTestId('scopes-search'), 'user');

		expect(queryByTestId('scope-group-toggle-members')).not.toBeInTheDocument();
	});

	it('moves the radio to Custom when selection drifts away from a preset', async () => {
		const { getByTestId, rerender } = renderComponent({
			props: { modelValue: availableScopes, availableScopes },
		});

		expect(getByTestId('scopes-mode-all')).toBeChecked();

		await rerender({ modelValue: ['workflow:read'] as ApiKeyScope[], availableScopes });

		expect(getByTestId('scopes-mode-custom')).toBeChecked();
	});

	it('disables the mode radios and scope checkboxes when disabled', async () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: ['workflow:read'] as ApiKeyScope[], availableScopes, disabled: true },
		});

		expect(getByTestId('scopes-mode-all')).toBeDisabled();
		expect(getByTestId('scope-group-workflowsAndExecutions')).toBeDisabled();

		await userEvent.click(getByTestId('scope-group-toggle-workflowsAndExecutions'));

		expect(getByTestId('scope-checkbox-workflow:read')).toBeDisabled();
	});

	it('renders read and write badges for scopes in an expanded group', async () => {
		const { getByTestId, getAllByText } = renderComponent({
			props: { modelValue: [] as ApiKeyScope[], availableScopes },
		});

		await userEvent.click(getByTestId('scope-group-toggle-workflowsAndExecutions'));

		// workflow:read / workflow:list / execution:read classify as read; workflow:create as write.
		expect(getAllByText('read').length).toBeGreaterThan(0);
		expect(getAllByText('write').length).toBeGreaterThan(0);
	});
});
