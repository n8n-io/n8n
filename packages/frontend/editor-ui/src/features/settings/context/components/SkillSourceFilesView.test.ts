import { createTestingPinia } from '@pinia/testing';
import { within } from '@testing-library/vue';
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
