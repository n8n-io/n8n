import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ResponseError } from '@n8n/rest-api-client';
import type { DiscoveredSkill, FrontendModuleSettings, SkillSourcePreview } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
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

it.each([
	{ assistantEnabled: true, mcpEnabled: true },
	{ assistantEnabled: true, mcpEnabled: false },
	{ assistantEnabled: false, mcpEnabled: true },
	{ assistantEnabled: false, mcpEnabled: false },
])(
	'explains setup when Assistant is $assistantEnabled and MCP is $mcpEnabled without blocking import',
	async ({ assistantEnabled, mcpEnabled }) => {
		const settings = useSettingsStore();
		vi.mocked(settings.isModuleActive).mockReturnValue(true);
		settings.moduleSettings = {
			'instance-ai': mock<NonNullable<FrontendModuleSettings['instance-ai']>>({
				enabled: assistantEnabled,
			}),
			mcp: { mcpAccessEnabled: mcpEnabled },
		};
		const view = render();
		expect(
			view.getByText(
				assistantEnabled ? /n8n Assistant is enabled/ : /Enable it in Settings > Assistant/,
			),
		).toBeVisible();
		expect(
			view.getByText(
				mcpEnabled ? /Connect your external agent/ : /enable instance-level MCP in Settings/,
			),
		).toBeVisible();
		await waitFor(() => expect(view.getByTestId('skill-catalog-add')).toBeEnabled());
	},
);

it('does not offer settings for unavailable modules', () => {
	const settings = useSettingsStore();
	vi.mocked(settings.isModuleActive).mockReturnValue(false);
	settings.moduleSettings = {
		'instance-ai': mock<NonNullable<FrontendModuleSettings['instance-ai']>>({ enabled: true }),
		mcp: { mcpAccessEnabled: true },
	};
	const view = render();
	expect(view.getByText(/n8n Assistant isn't available/)).toBeVisible();
	expect(view.getByText(/Instance-level MCP isn't available/)).toBeVisible();
	expect(view.queryByText(/Settings >/)).not.toBeInTheDocument();
});

it('keeps requirements for content skills independent of n8n tool settings', () => {
	const view = render({
		props: {
			entry: { ...entry, requirementsKey: 'settings.context.skills.catalog.requirements.text' },
		},
	});
	expect(view.getByText(/Provide the relevant text, audience, and product context/)).toBeVisible();
	expect(view.queryByText(/n8n Assistant isn't available/)).not.toBeInTheDocument();
	expect(view.queryByText(/Instance-level MCP isn't available/)).not.toBeInTheDocument();
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
