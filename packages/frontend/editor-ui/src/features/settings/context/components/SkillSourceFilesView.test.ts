import { createTestingPinia } from '@pinia/testing';
import { fireEvent, within } from '@testing-library/vue';
import type { DiscoveredSkill } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import SkillSourceFilesView from './SkillSourceFilesView.vue';

const render = createComponentRenderer(SkillSourceFilesView);
const skill: DiscoveredSkill = {
	key: 'skills/release-notes',
	name: 'release-notes',
	description: 'Write release notes.',
	location: 'skills/release-notes',
	webUrl: 'https://github.com/acme/skills/tree/abc/skills/release-notes',
	skippedFiles: [],
	previewFiles: [],
	previewTruncated: false,
	nameTaken: false,
	error: null,
	check: { verdict: 'pass', findings: [] },
};

beforeEach(() => {
	createTestingPinia();
});

it('uses the workflow diff viewer for changed lines and words', () => {
	const view = render({
		props: {
			skill,
			diffFiles: [{ path: 'SKILL.md', before: 'Use plain text.', after: 'Use Markdown text.' }],
		},
	});
	const diff = view.getByTestId('skill-source-file-diff');
	expect(diff).toHaveClass('code-diff-view');
	expect(diff.querySelector('.blob-code-deletion')).toHaveTextContent('Use plain text.');
	expect(diff.querySelector('.blob-code-addition')).toHaveTextContent('Use Markdown text.');
	expect(diff.querySelector('.blob-code-deletion .x')).toHaveTextContent('plain');
	expect(diff.querySelector('.blob-code-addition .x')).toHaveTextContent('Markdown');
	expect(view.container.querySelector('pre')).not.toBeInTheDocument();
});

it('marks incoming diff lines, renders markup as text, and clears stale findings', async () => {
	const after = 'Heading\nSee <img src=x> and https://example.com.';
	const view = render({
		props: {
			skill: {
				...skill,
				check: {
					verdict: 'needs_review',
					findings: [
						{
							rule: 'new_url',
							severity: 'needs_review',
							file: 'SKILL.md',
							detail: '',
							domain: 'example.com',
							location: { line: 2, start: 20, end: 39 },
						},
					],
				},
			},
			diffFiles: [{ path: 'SKILL.md', before: `Removed heading\n${after}`, after }],
		},
	});
	expect(view.getByTestId('skill-source-findings')).toHaveTextContent('1 issue to review');
	expect(view.getByTestId('skill-source-findings')).toHaveTextContent(
		'Links to a new domain in SKILL.md:2',
	);
	const mark = view.getByTestId('skill-source-finding-mark');
	expect(mark).toHaveTextContent('https://example.com');
	expect(mark).toHaveAttribute('title', 'Links to a new domain');
	expect(mark.closest('tr')?.children[1]).toHaveTextContent('2');
	const scroll = vi.fn();
	mark.closest('tr')!.scrollIntoView = scroll;
	await fireEvent.click(view.getByRole('link', { name: 'Links to a new domain in SKILL.md:2' }));
	expect(scroll).toHaveBeenCalled();
	expect(mark.closest('.blob-code')).toHaveTextContent('See <img src=x> and https://example.com.');
	expect(view.container.querySelector('pre')).not.toBeInTheDocument();
	expect(view.container.querySelector('img')).not.toBeInTheDocument();
	expect(view.getByTestId('skill-source-file-diff')).toHaveTextContent('Removed heading');
	await view.rerender({ skill });
	expect(view.queryByTestId('skill-source-finding-mark')).not.toBeInTheDocument();
	expect(view.getByTestId('skill-source-file-diff')).toHaveTextContent(after.split('\n')[1]);
});

it('keeps unchanged file content visible when it is far from the change', () => {
	const lines = Array.from({ length: 80 }, (_, index) => `Line ${index + 1}`);
	const before = lines.join('\n');
	lines[40] = 'Updated line 41';
	const view = render({
		props: { skill, diffFiles: [{ path: 'SKILL.md', before, after: lines.join('\n') }] },
	});
	const diff = within(view.getByTestId('skill-source-file-diff'));
	expect(diff.getByText('Line 1', { exact: true })).toBeVisible();
	expect(diff.getByText('Line 80', { exact: true })).toBeVisible();
});

it('shows import previews without a diff', () => {
	const view = render({
		props: { skill: { ...skill, previewFiles: [{ path: 'SKILL.md', text: 'Use plain text.' }] } },
	});
	expect(view.getByText('Use plain text.')).toBeVisible();
	expect(view.queryByTestId('skill-source-file-diff')).not.toBeInTheDocument();
});

it('marks a binary update and shows text when a file changes encoding', () => {
	const view = render({
		props: {
			skill,
			diffFiles: [
				{
					path: 'assets/logo.png',
					before: '',
					after: '',
					beforeIsBinary: true,
					afterIsBinary: true,
					status: 'modified',
				},
				{
					path: 'guide',
					before: '',
					after: 'New plain text.',
					beforeIsBinary: true,
					status: 'modified',
				},
				{
					path: 'assets/same.png',
					before: '',
					after: '',
					beforeIsBinary: true,
					afterIsBinary: true,
				},
			],
		},
	});
	const logo = within(view.getByRole('region', { name: 'skills/release-notes/assets/logo.png' }));
	const guide = within(view.getByRole('region', { name: 'skills/release-notes/guide' }));
	const same = within(view.getByRole('region', { name: 'skills/release-notes/assets/same.png' }));
	expect(logo.getByText('Modified file')).toBeVisible();
	expect(logo.queryByTestId('skill-source-file-diff')).not.toBeInTheDocument();
	expect(guide.getByText('Modified file')).toBeVisible();
	expect(guide.getByTestId('skill-source-file-diff')).toHaveTextContent('New plain text.');
	expect(same.queryByText('Modified file')).not.toBeInTheDocument();
});

it('explains blocked content and links files without a preview to their source', () => {
	const view = render({
		props: {
			skill: {
				...skill,
				skippedFiles: ['scripts/run.sh'],
				check: {
					verdict: 'blocked',
					findings: [
						{
							rule: 'invalid_skill',
							severity: 'blocked',
							file: 'SKILL.md',
							detail: 'The description is missing.',
						},
					],
				},
			},
		},
	});
	expect(view.getByText('The description is missing.')).toBeVisible();
	expect(view.getByRole('link', { name: /Not a valid skill in SKILL.md/ })).toHaveAttribute(
		'href',
		'https://github.com/acme/skills/blob/abc/skills/release-notes/SKILL.md',
	);
	expect(view.getByRole('link', { name: 'skills/release-notes/scripts/run.sh' })).toHaveAttribute(
		'href',
		'https://github.com/acme/skills/blob/abc/skills/release-notes/scripts/run.sh',
	);
});

it('shows one line for all skipped scripts, which goes to the list of skipped files', async () => {
	const scripts = ['a', 'b', 'c', 'd', 'e'].map((name) => `scripts/${name}.sh`);
	const view = render({
		props: {
			skill: {
				...skill,
				skippedFiles: [...scripts, 'assets/logo.png'],
				check: {
					verdict: 'needs_review',
					findings: [
						...scripts.map((file) => ({
							rule: 'file_skipped' as const,
							severity: 'needs_review' as const,
							file,
							detail: '',
						})),
						{ rule: 'file_skipped', severity: 'info', file: 'assets/logo.png', detail: '' },
					],
				},
			},
		},
	});
	const notice = view.getByTestId('skill-source-findings');
	expect(notice).toHaveTextContent('1 issue to review');
	expect(within(notice).getAllByRole('listitem')).toHaveLength(1);
	expect(view.getAllByTestId('skill-source-skipped-file')).toHaveLength(6);
	const skipped = view.getByRole('region', { name: 'Files that n8n leaves out' });
	const scrollIntoView = vi.fn();
	skipped.scrollIntoView = scrollIntoView;

	await fireEvent.click(
		within(notice).getByRole('link', { name: '5 scripts that n8n leaves out' }),
	);

	expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', inline: 'nearest' });
	expect(skipped).toHaveFocus();
});

it('counts one skipped script as one issue next to the other findings', () => {
	const view = render({
		props: {
			skill: {
				...skill,
				skippedFiles: ['scripts/run.sh'],
				check: {
					verdict: 'needs_review',
					findings: [
						{ rule: 'hidden_unicode', severity: 'needs_review', file: 'SKILL.md', detail: '' },
						{ rule: 'file_skipped', severity: 'needs_review', file: 'scripts/run.sh', detail: '' },
					],
				},
			},
		},
	});
	const notice = view.getByTestId('skill-source-findings');
	expect(notice).toHaveTextContent('2 issues to review');
	expect(notice).toHaveTextContent('1 script that n8n leaves out');
});

it('writes the reason of a size finding from its limit, not from the server text', () => {
	const view = render({
		props: {
			skill: {
				...skill,
				check: {
					verdict: 'blocked',
					findings: [
						{
							rule: 'over_limit',
							severity: 'blocked',
							file: 'SKILL.md',
							detail: 'server text',
							limit: { field: 'name', max: 128, current: 200 },
						},
						{
							rule: 'over_limit',
							severity: 'blocked',
							file: 'SKILL.md',
							detail: 'server text',
							limit: { field: 'referenceCount', max: 20, current: 21 },
						},
						{ rule: 'over_limit', severity: 'blocked', file: 'SKILL.md', detail: 'server text' },
					],
				},
			},
		},
	});
	expect(
		view.getAllByTestId('skill-source-finding-reason').map((reason) => reason.textContent?.trim()),
	).toEqual([
		'The name can have at most 128 characters. It has 200.',
		'A skill can have at most 20 reference files. It has 21.',
	]);
	expect(view.queryByText('server text')).not.toBeInTheDocument();
});

it('preserves word changes when a finding crosses diff spans', () => {
	const view = render({
		props: {
			skill: {
				...skill,
				check: {
					verdict: 'needs_review',
					findings: [
						{
							rule: 'new_url',
							severity: 'needs_review',
							file: 'SKILL.md',
							detail: '',
							location: { line: 1, start: 4, end: 23 },
						},
					],
				},
			},
			diffFiles: [
				{ path: 'SKILL.md', before: 'See https://example.org.', after: 'See https://example.com.' },
			],
		},
	});
	const diff = view.getByTestId('skill-source-file-diff');
	expect(diff.querySelector('.blob-code-deletion mark')).not.toBeInTheDocument();
	expect(diff.querySelector('.blob-code-addition .x')).toHaveTextContent('com');
	expect(
		view
			.getAllByTestId('skill-source-finding-mark')
			.map((mark) => mark.textContent)
			.join(''),
	).toBe('https://example.com');
	expect(diff.querySelector('.blob-code-addition')).toHaveTextContent('See https://example.com.');
});
