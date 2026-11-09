import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import ProjectSelect from '../ProjectSelect.vue';

const renderComponent = createComponentRenderer(ProjectSelect);

const PROJECTS = [
	{ id: 'personal', type: 'personal' },
	{ id: 'marketing', type: 'team', name: 'Marketing' },
	{ id: 'sales', type: 'team', name: 'Sales' },
	{ id: 'support', type: 'team', name: 'Support' },
	{ id: 'finance', type: 'team', name: 'Finance' },
	{ id: 'engineering', type: 'team', name: 'Engineering' },
] as ProjectListItem[];

describe('ProjectSelect', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		mockedStore(useProjectsStore).myProjects = PROJECTS;
	});

	it('filters the projects by the search term', async () => {
		const { getByRole, getByPlaceholderText, queryByRole } = renderComponent({
			props: { modelValue: 'personal' },
		});

		await userEvent.click(getByRole('button', { name: /Personal space/ }));
		await userEvent.type(getByPlaceholderText('Search projects'), 'sa');

		await waitFor(() => {
			expect(queryByRole('menuitemcheckbox', { name: /Marketing/ })).not.toBeInTheDocument();
		});
		expect(getByRole('menuitemcheckbox', { name: /Sales/ })).toBeInTheDocument();
	});

	it('matches the personal project by its display name', async () => {
		const { getByRole, getByPlaceholderText, queryByRole } = renderComponent({
			props: { modelValue: 'sales' },
		});

		await userEvent.click(getByRole('button', { name: /Sales/ }));
		await userEvent.type(getByPlaceholderText('Search projects'), 'personal');

		await waitFor(() => {
			expect(queryByRole('menuitemcheckbox', { name: /Sales/ })).not.toBeInTheDocument();
		});
		expect(getByRole('menuitemcheckbox', { name: /Personal space/ })).toBeInTheDocument();
	});

	it('clears the search term when the search field is removed', async () => {
		const { getByRole, getByPlaceholderText, queryByPlaceholderText, queryByRole } =
			renderComponent({ props: { modelValue: 'personal' } });

		await userEvent.click(getByRole('button', { name: /Personal space/ }));
		await userEvent.type(getByPlaceholderText('Search projects'), 'sa');
		await waitFor(() => {
			expect(queryByRole('menuitemcheckbox', { name: /Marketing/ })).not.toBeInTheDocument();
		});

		mockedStore(useProjectsStore).myProjects = PROJECTS.slice(0, 5);

		await waitFor(() => {
			expect(queryByPlaceholderText('Search projects')).not.toBeInTheDocument();
		});
		expect(getByRole('menuitemcheckbox', { name: /Marketing/ })).toBeInTheDocument();
	});

	it('shows the empty text when no project matches', async () => {
		const { getByRole, getByPlaceholderText, findByText } = renderComponent({
			props: { modelValue: 'personal' },
		});

		await userEvent.click(getByRole('button', { name: /Personal space/ }));
		await userEvent.type(getByPlaceholderText('Search projects'), 'zzz');

		expect(await findByText('No results')).toBeInTheDocument();
	});
});
