import { SkillParseError } from '../errors/skill-parse.error';
import { readGitHubSkillFolder } from '../sources/github/skill-reference-examples';

const skill = (body = 'Read the examples.') => ({
	path: 'SKILL.md',
	content: `---\nname: examples\ndescription: Workflow examples\n---\n\n${body}\n`,
});

describe('GitHub reference examples', () => {
	it.each([
		['JSON', 'json'],
		['TS', 'typescript'],
	])('retains uppercase %s references', (extension, language) => {
		const path = `references/example.${extension}`;
		const { content, skippedFiles } = readGitHubSkillFolder('examples', [
			skill(`Read [example](${path}).`),
			{ path, content: 'example' },
		]);
		expect(content.instructions).toContain(`${path}.md`);
		expect(content.files[0]).toMatchObject({
			path: `${path}.md`,
			content: expect.stringContaining('```' + language + '\nexample'),
		});
		expect(skippedFiles).toEqual([]);
	});
	it('updates local links and file names without changing URLs or code blocks', () => {
		const { content } = readGitHubSkillFolder('examples', [
			skill('Read `references/examples/workflow.json` and `usage.ts`.'),
			{
				path: 'references/guide.md',
				content: [
					'[Workflow](./examples/workflow.json#example)',
					'[`examples/usage.ts`](examples/usage.ts)',
					'Use `examples/*.json`.',
					'[Original](https://example.test/examples/workflow.json)',
					'```md',
					'`examples/workflow.json`',
					'```',
				].join('\n'),
			},
			{ path: 'references/examples/workflow.json', content: '{}' },
			{ path: 'references/examples/usage.ts', content: 'export const value = 1;' },
		]);
		expect(content.instructions).toBe(
			'Read `references/examples/workflow.json.md` and `references/examples/usage.ts.md`.',
		);
		expect(content.files.find((file) => file.path === 'references/guide.md')?.content).toBe(
			[
				'[Workflow](./examples/workflow.json.md#example)',
				'[`examples/usage.ts.md`](examples/usage.ts.md)',
				'Use `examples/*.json.md`.',
				'[Original](https://example.test/examples/workflow.json)',
				'```md',
				'`examples/workflow.json`',
				'```',
			].join('\n'),
		);
	});

	it('keeps source text intact when it contains Markdown fences and file names', () => {
		const source = 'const example = `\n```json\n{}\n```\n`;\n// references/example.ts';
		const { content } = readGitHubSkillFolder('examples', [
			skill(),
			{ path: 'references/example.ts', content: source },
		]);
		expect(content.files[0].content).toBe(
			`Stored as a Markdown reference by n8n. Original file: references/example.ts\n\n\`\`\`\`typescript\n${source}\n\`\`\`\`\n`,
		);
	});

	it('rejects a converted name that is already used by a source file', () => {
		expect(() =>
			readGitHubSkillFolder('examples', [
				skill(),
				{ path: 'references/example.json', content: '{}' },
				{ path: 'references/example.json.md', content: 'Another reference.' },
			]),
		).toThrow(SkillParseError);
	});

	it('lists unstorable examples and unsupported files without importing them', () => {
		const result = readGitHubSkillFolder('examples', [
			skill(),
			{ path: 'references/example.ts', content: '\0' },
			{ path: 'scripts/run.ts', content: 'export const value = 1;' },
			{ path: 'references/example.py', content: 'value = 1' },
		]);
		expect(result.content.files).toEqual([]);
		expect(result.unstorableFiles).toEqual(['references/example.ts']);
		expect(result.skippedFiles).toEqual([
			'references/example.py',
			'references/example.ts',
			'scripts/run.ts',
		]);
	});

	it('keeps same-named examples distinct and leaves ambiguous file names unchanged', () => {
		const { content } = readGitHubSkillFolder('examples', [
			skill('Read `example.ts`.'),
			{ path: 'references/a/example.ts', content: 'export const a = 1;' },
			{ path: 'references/b/example.ts', content: 'export const b = 2;' },
		]);
		expect(content.instructions).toBe('Read `example.ts`.');
		expect(content.files.map((file) => file.path)).toEqual([
			'references/a/example.ts.md',
			'references/b/example.ts.md',
		]);
	});
});
