import { SkillSecurityScanner } from '../services/skill-security-scanner.service';
import type { SkillContent } from '../utils/skill-content-hash';
import { skillMdText, showHidden } from '../utils/skill-text';
import { updateCounts, updateFiles } from '../utils/skill-update-review';

const content: SkillContent = {
	name: 'release-notes',
	description: 'Write release notes.',
	instructions: 'Use short sentences.',
	frontmatter: { license: 'MIT', 'allowed-tools': 'Read' },
	files: [],
};

it('omits changes caused only by frontmatter key order', () => {
	const after = { ...content, frontmatter: { 'allowed-tools': 'Read', license: 'MIT' } };
	const files = updateFiles(content, after);
	expect(files[0].before).toBe(files[0].after);
	expect(updateCounts(files)).toEqual({ added: 0, removed: 0 });
	expect(Object.keys(content.frontmatter ?? {})).toEqual(['license', 'allowed-tools']);
});

it.each([
	{ before: { a: 1, b: 2 }, after: { b: 2, a: 1 }, changes: 0 },
	{ before: [{ a: 1, b: 2 }], after: [{ b: 2, a: 1 }], changes: 0 },
	{ before: { a: 1, b: 2 }, after: { b: 2, a: 3 }, changes: 1 },
	{ before: [{ a: 1 }, { b: 2 }], after: [{ b: 2 }, { a: 1 }], changes: 1 },
])('ignores nested key order but keeps changes: %#', ({ before, after, changes }) => {
	const incoming = { ...content, frontmatter: { metadata: after } };
	const files = updateFiles({ ...content, frontmatter: { metadata: before } }, incoming);
	expect(updateCounts(files)).toEqual({ added: changes, removed: changes });
	expect(files[0].after).toBe(showHidden(skillMdText(incoming).text));
});

it('keeps changed values and stored finding positions in the incoming text', () => {
	const after = {
		...content,
		frontmatter: { 'allowed-tools': 'Read Bash', license: 'MIT' },
	};
	const scan = new SkillSecurityScanner().scan(
		{ content: after, skippedFiles: [], fidelity: [] },
		content,
	);
	const [file] = updateFiles(content, after);
	expect(file.before.split('\n')[3]).toBe('allowed-tools: "Read"');
	expect(file.after).toBe(showHidden(skillMdText(after).text));
	expect(scan.findings).toHaveLength(1);
	const location = scan.findings[0].location!;
	expect(location.line).toBe(4);
	expect(file.after.split('\n')[location.line - 1].slice(location.start, location.end)).toBe(
		'allowed-tools',
	);
	expect(updateCounts([file])).toEqual({ added: 1, removed: 1 });
});

it.each([
	{ before: null, after: { license: 'MIT' }, added: 1, removed: 0 },
	{ before: { license: 'MIT' }, after: null, added: 0, removed: 1 },
	{ before: { license: 'MIT' }, after: { owner: 'docs' }, added: 1, removed: 1 },
])('shows added and removed keys: $before to $after', ({ before, after, added, removed }) => {
	const files = updateFiles(
		{ ...content, frontmatter: before },
		{ ...content, frontmatter: after },
	);
	expect(updateCounts(files)).toEqual({ added, removed });
	expect(files[0].after).toBe(showHidden(skillMdText({ ...content, frontmatter: after }).text));
});
