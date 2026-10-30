import type { SkillListItem, SkillSourceListItem } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';

import SkillSources from './SkillSources.vue';
import { useSkillsStore } from '../skills.store';

vi.mock('@n8n/design-system', async () => {
	const actual = await vi.importActual<typeof import('@n8n/design-system')>('@n8n/design-system');
	return {
		...actual,
		N8nDialogTitle: { template: '<h2><slot /></h2>' },
		N8nDialog: {
			props: ['open', 'header'],
			emits: ['update:open'],
			template: '<div v-if="open" role="dialog"><h2>{{ header }}</h2><slot /></div>',
		},
	};
});

const source: SkillSourceListItem = {
	id: 'src-1',
	type: 'github',
	label: 'acme/skills',
	ref: 'main',
	path: '',
	webUrl: 'https://github.com/acme/skills/tree/main',
	scope: 'instance',
	projectId: null,
	projectName: null,
	projectType: null,
	skillCount: 2,
	canAddSkills: true,
};
const importedSkill = (id: string, name: string): SkillListItem => ({
	id,
	name,
	description: `${name} instructions`,
	scope: 'instance',
	projectId: null,
	projectName: null,
	projectType: null,
	agentId: null,
	agentName: null,
	source: 'github',
	createdBy: null,
	latestVersion: 1,
	usedByAgents: 0,
	availableToAssistant: false,
	canEdit: false,
	canDelete: true,
	canStopSyncing: true,
	createdAt: '2026-10-01T00:00:00.000Z',
	updatedAt: '2026-10-01T00:00:00.000Z',
});
const imported = [importedSkill('skill-1', 'pdf'), importedSkill('skill-2', 'docx')];

const renderSources = createComponentRenderer(SkillSources);

function render() {
	return renderSources({ props: { canConnect: true } });
}

beforeEach(() => {
	createTestingPinia();
	mockedStore(useSkillsStore).sources = [source];
	mockedStore(useSkillsStore).fetchSources.mockResolvedValue([source]);
	mockedStore(useSkillsStore).fetchSourceSkills.mockResolvedValue({ count: 2, data: imported });
});

it('opens Add more from the source menu', async () => {
	const view = render();
	await waitFor(() => expect(view.getByText('acme/skills')).toBeInTheDocument());
	await userEvent.click(view.getByRole('button', { name: 'Source actions' }));
	await userEvent.click(await view.findByText('Add more skills'));
	expect(view.emitted('addMore')).toEqual([['src-1']]);
});

it('shows the fixed scope and count in source details and opens Add more', async () => {
	const view = render();
	await userEvent.click(await view.findByTestId('skill-source-open-src-1'));
	const dialog = within(view.getByRole('dialog'));
	expect(await dialog.findByText('pdf')).toBeInTheDocument();
	expect(dialog.getByText('docx instructions')).toBeInTheDocument();
	expect(mockedStore(useSkillsStore).fetchSourceSkills).toHaveBeenCalledWith('src-1', 0, 10);
	expect(dialog.getByRole('heading', { name: 'Source details' })).toBeInTheDocument();
	expect(dialog.getByText('Global')).toBeInTheDocument();
	expect(dialog.getByText('2 skills')).toBeInTheDocument();
	expect(dialog.getByRole('link', { name: 'Open in GitHub' })).toHaveAttribute(
		'href',
		source.webUrl,
	);
	await userEvent.click(dialog.getByTestId('skill-source-details-add-more'));
	expect(view.emitted('addMore')).toEqual([['src-1']]);
	expect(view.queryByRole('dialog')).not.toBeInTheDocument();
});

it('lets viewers read the source without offering Add more', async () => {
	mockedStore(useSkillsStore).sources = [{ ...source, canAddSkills: false }];
	const view = render();
	await userEvent.click(await view.findByTestId('skill-source-open-src-1'));
	expect(view.queryByTestId('skill-source-details-add-more')).not.toBeInTheDocument();
});

it('searches source names', async () => {
	const view = render();
	await view.findByTestId('skill-source-open-src-1');
	await userEvent.type(view.getByPlaceholderText('Search sources by name'), 'other');
	expect(view.queryByTestId('skill-source-open-src-1')).not.toBeInTheDocument();
	expect(view.getByTestId('skill-sources-empty')).toHaveTextContent('No sources match your search');
});

it('shows a retry on load failure instead of the empty state', async () => {
	mockedStore(useSkillsStore).fetchSources.mockRejectedValueOnce(new Error('offline'));
	const view = render();
	await view.findByTestId('skill-sources-error');
	expect(view.queryByTestId('skill-sources-empty')).not.toBeInTheDocument();
	await userEvent.click(view.getByRole('button', { name: 'Retry' }));
	await view.findByTestId('skill-source-open-src-1');
	expect(view.queryByTestId('skill-sources-error')).not.toBeInTheDocument();
});

it('loads more imported skills without replacing the main skills table', async () => {
	const store = mockedStore(useSkillsStore);
	store.fetchSourceSkills.mockResolvedValueOnce({ count: 2, data: [imported[0]] });
	store.fetchSourceSkills.mockResolvedValueOnce({ count: 2, data: [imported[1]] });
	const view = render();
	await userEvent.click(await view.findByTestId('skill-source-open-src-1'));
	await userEvent.click(await view.findByRole('button', { name: 'Load more skills' }));
	expect(await view.findByText('docx')).toBeInTheDocument();
	expect(view.getByText('pdf')).toBeInTheDocument();
	expect(store.fetchSourceSkills).toHaveBeenLastCalledWith('src-1', 1, 10);
	expect(store.fetchSkills).not.toHaveBeenCalled();
	expect(view.queryByRole('button', { name: 'Load more skills' })).not.toBeInTheDocument();
});

it('retries failed source details without showing an empty list', async () => {
	mockedStore(useSkillsStore).fetchSourceSkills.mockRejectedValueOnce(new Error('offline'));
	const view = render();
	await userEvent.click(await view.findByTestId('skill-source-open-src-1'));
	await view.findByText("Imported skills couldn't be loaded. Try again.");
	expect(view.queryByText('No skills are linked to this source')).not.toBeInTheDocument();
	await userEvent.click(view.getByRole('button', { name: 'Retry' }));
	expect(await view.findByText('pdf')).toBeInTheDocument();
});

it('shows when a source no longer has linked skills', async () => {
	mockedStore(useSkillsStore).fetchSourceSkills.mockResolvedValueOnce({ count: 0, data: [] });
	const view = render();
	await userEvent.click(await view.findByTestId('skill-source-open-src-1'));
	expect(await view.findByText('No skills are linked to this source')).toBeInTheDocument();
});
