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

it('keeps flagged excerpts on their new line numbers and renders markup as text', () => {
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
	expect(view.getByText('Flagged lines in the update')).toBeVisible();
	const mark = view.getByTestId('skill-source-finding-mark');
	expect(mark).toHaveTextContent('https://example.com');
	expect(mark).toHaveAttribute('title', 'Links to a new domain');
	expect(mark.closest('pre')).toHaveTextContent('2See <img src=x> and https://example.com.');
	expect(view.container.querySelector('img')).not.toBeInTheDocument();
	expect(view.getByTestId('skill-source-file-diff')).toHaveTextContent('Removed heading');
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
