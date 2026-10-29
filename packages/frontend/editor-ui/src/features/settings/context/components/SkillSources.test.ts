import type { SkillSourceListItem } from '@n8n/api-types';
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
const renderSources = createComponentRenderer(SkillSources);

function render() {
	return renderSources({ props: { canConnect: true } });
}

beforeEach(() => {
	createTestingPinia();
	mockedStore(useSkillsStore).sources = [source];
	mockedStore(useSkillsStore).fetchSources.mockResolvedValue([source]);
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
