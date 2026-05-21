import { createComponentRenderer } from '@/__tests__/render';
import type { ApiKeyScope } from '@n8n/permissions';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import ApiKeyScopes from './ApiKeyScopes.vue';

const AVAILABLE_SCOPES: ApiKeyScope[] = [
	'workflow:read',
	'workflow:list',
	'workflow:create',
	'workflow:update',
	'workflow:delete',
	'workflow:activate',
	'credential:read',
	'credential:list',
	'credential:create',
	'user:read',
	'user:list',
];

const renderComponent = createComponentRenderer(ApiKeyScopes);

async function openDropdown(getByTestId: (id: string) => HTMLElement) {
	const trigger = getByTestId('scopes-select').querySelector('input');
	await userEvent.click(trigger!);
}

describe('ApiKeyScopes', () => {
	test('renders one quick-select chip per unique operation', async () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: [], availableScopes: AVAILABLE_SCOPES },
		});

		await openDropdown(getByTestId);

		await waitFor(() => {
			expect(getByTestId('scope-chip-read')).toBeInTheDocument();
			expect(getByTestId('scope-chip-list')).toBeInTheDocument();
			expect(getByTestId('scope-chip-create')).toBeInTheDocument();
			expect(getByTestId('scope-chip-update')).toBeInTheDocument();
			expect(getByTestId('scope-chip-delete')).toBeInTheDocument();
			expect(getByTestId('scope-chip-activate')).toBeInTheDocument();
		});
	});

	test('clicking a chip selects every scope for that operation', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { modelValue: [], availableScopes: AVAILABLE_SCOPES },
		});

		await openDropdown(getByTestId);
		const readChip = await waitFor(() => getByTestId('scope-chip-read'));

		await userEvent.click(readChip);

		const events = emitted('update:modelValue') as Array<[string[]]>;
		const last = events.at(-1)?.[0] ?? [];
		expect(last.sort()).toEqual(['credential:read', 'user:read', 'workflow:read'].sort());
	});

	test('clicking a chip again when all selected deselects them', async () => {
		const allReadScopes: ApiKeyScope[] = ['workflow:read', 'credential:read', 'user:read'];
		const { getByTestId, emitted } = renderComponent({
			props: { modelValue: allReadScopes, availableScopes: AVAILABLE_SCOPES },
		});

		await openDropdown(getByTestId);
		const readChip = await waitFor(() => getByTestId('scope-chip-read'));

		await userEvent.click(readChip);

		const events = emitted('update:modelValue') as Array<[string[]]>;
		const last = events.at(-1)?.[0] ?? [];
		expect(last).toEqual([]);
	});

	test('clicking a chip when partially selected fills in the rest', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				modelValue: ['workflow:read'] as ApiKeyScope[],
				availableScopes: AVAILABLE_SCOPES,
			},
		});

		await openDropdown(getByTestId);
		const readChip = await waitFor(() => getByTestId('scope-chip-read'));

		await userEvent.click(readChip);

		const events = emitted('update:modelValue') as Array<[string[]]>;
		const last = events.at(-1)?.[0] ?? [];
		expect(last.sort()).toEqual(['credential:read', 'user:read', 'workflow:read'].sort());
	});

	test('typing in the search input narrows visible scope groups', async () => {
		const { getByTestId, container } = renderComponent({
			props: { modelValue: [], availableScopes: AVAILABLE_SCOPES },
		});

		await openDropdown(getByTestId);
		const searchInput = (await waitFor(() => getByTestId('scopes-search'))) as HTMLInputElement;

		await userEvent.type(searchInput, 'credential');

		await waitFor(() => {
			const items = document.querySelectorAll('.el-select-dropdown__item');
			const labels = Array.from(items).map((el) => el.textContent?.trim() ?? '');
			expect(labels.some((l) => l.startsWith('credential:'))).toBe(true);
			expect(labels.some((l) => l.startsWith('workflow:'))).toBe(false);
			expect(labels.some((l) => l.startsWith('user:'))).toBe(false);
		});

		expect(container).toBeTruthy();
	});

	test('select-all toggles only filtered scopes when filter is active', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				modelValue: ['workflow:activate'] as ApiKeyScope[],
				availableScopes: AVAILABLE_SCOPES,
			},
		});

		await openDropdown(getByTestId);
		const searchInput = (await waitFor(() => getByTestId('scopes-search'))) as HTMLInputElement;

		await userEvent.type(searchInput, 'credential');

		const selectAll = await waitFor(() => getByTestId('scopes-select-all'));
		await userEvent.click(selectAll);

		const events = emitted('update:modelValue') as Array<[string[]]>;
		const last = events.at(-1)?.[0] ?? [];
		expect(last.sort()).toEqual(
			['workflow:activate', 'credential:create', 'credential:list', 'credential:read'].sort(),
		);
	});

	test('shows empty-state option when filter matches nothing', async () => {
		const { getByTestId } = renderComponent({
			props: { modelValue: [], availableScopes: AVAILABLE_SCOPES },
		});

		await openDropdown(getByTestId);
		const searchInput = (await waitFor(() => getByTestId('scopes-search'))) as HTMLInputElement;

		await userEvent.type(searchInput, 'zzznomatch');

		await waitFor(() => {
			expect(getByTestId('scopes-empty')).toBeInTheDocument();
		});
	});
});
