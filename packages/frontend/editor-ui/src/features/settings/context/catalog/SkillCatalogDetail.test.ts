import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ResponseError } from '@n8n/rest-api-client';
import type { DiscoveredSkill, SkillSourcePreview } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';
import SkillCatalogDetail from './SkillCatalogDetail.vue';
import { SKILL_CATALOG } from './skillCatalog';
import { previewSkillSource } from '../skills.api';

vi.mock('../skills.api', () => ({ previewSkillSource: vi.fn() }));
const preview = vi.mocked(previewSkillSource);
const entry = SKILL_CATALOG[0];
const skill: DiscoveredSkill = {
	key: 'selected',
	location: entry.location,
	name: 'build',
	description: 'Build workflows',
	webUrl: entry.url,
	skippedFiles: [],
	previewTruncated: false,
	nameTaken: false,
	error: null,
	previewFiles: [{ path: 'SKILL.md', text: '# Instructions\nRead the workflow first.' }],
	check: { verdict: 'pass', findings: [] },
};
const render = createComponentRenderer(SkillCatalogDetail, {
	props: { entry, installed: [], canAdd: true },
});
beforeEach(() => {
	createTestingPinia();
	preview.mockReset();
	preview.mockResolvedValue(mock<SkillSourcePreview>({ skills: [skill] }));
});

it('shows the content before offering the existing import flow', async () => {
	const view = render();
	expect(view.getByTestId('skill-catalog-add')).toBeDisabled();
	expect(view.getByRole('status')).toHaveTextContent('Fetching skill from GitHub');
	await waitFor(() => expect(view.getByTestId('skill-catalog-add')).toBeEnabled());
	expect(view.getByTestId('skill-source-file-content')).toHaveTextContent(
		'Read the workflow first.',
	);
	await userEvent.click(view.getByTestId('skill-catalog-add'));
	expect(view.emitted('add')).toHaveLength(1);
	expect(preview).toHaveBeenCalledWith(expect.anything(), entry.url);
});

it('keeps browsing available without permission to add and links to the installed skill', async () => {
	const view = render({
		props: { canAdd: false, installed: [{ id: 'saved-1', label: 'Global' }] },
	});
	await view.findByTestId('skill-source-file-content');
	expect(view.getByTestId('skill-catalog-add')).toBeDisabled();
	await userEvent.click(view.getByRole('button', { name: 'View skill in Global' }));
	expect(view.emitted('openInstalled')).toEqual([['saved-1']]);
});

it('keeps an unpublished skill unavailable and allows retry after publication', async () => {
	preview.mockRejectedValueOnce(new ResponseError('Missing', { meta: { reason: 'not_found' } }));
	const view = render();
	expect(await view.findByTestId('skill-catalog-load-error')).toHaveTextContent(
		'after its source is published',
	);
	expect(view.getByTestId('skill-catalog-add')).toBeDisabled();
	await userEvent.click(view.getByRole('button', { name: 'Retry' }));
	await waitFor(() => expect(view.getByTestId('skill-catalog-add')).toBeEnabled());
});

it.each(['blocked', 'needs_review'] as const)(
	'shows %s findings before import',
	async (verdict) => {
		preview.mockResolvedValue(
			mock<SkillSourcePreview>({
				skills: [
					{
						...skill,
						check: {
							verdict,
							findings: [{ rule: 'new_url', severity: verdict, detail: '', domain: 'example.com' }],
						},
					},
				],
			}),
		);
		const view = render();
		const check = await view.findByTestId('skill-catalog-check');
		expect(check).toHaveTextContent('new domain');
		if (verdict === 'blocked') expect(view.getByTestId('skill-catalog-add')).toBeDisabled();
		else expect(view.getByTestId('skill-catalog-add')).toBeEnabled();
	},
);

it('refuses a catalog import that would omit unreviewed files', async () => {
	preview.mockResolvedValue(
		mock<SkillSourcePreview>({ skills: [{ ...skill, skippedFiles: ['script.py'] }] }),
	);
	const view = render();
	await view.findByTestId('skill-catalog-check');
	expect(view.getByTestId('skill-catalog-add')).toBeDisabled();
});
