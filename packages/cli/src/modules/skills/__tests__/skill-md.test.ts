import { SkillParseError } from '../errors/skill-parse.error';
import { skillContentHash, type SkillContent } from '../utils/skill-content-hash';
import { readSkillFolder, writeSkillFolder } from '../utils/skill-md';

const skillMd = (frontmatter: string, body = 'Use short sentences.') =>
	`---\n${frontmatter}\n---\n${body}`;

describe('readSkillFolder', () => {
	it.each([
		{
			case: 'name and description only',
			frontmatter: 'name: Brand voice\ndescription: Write in our voice',
			expected: { name: 'Brand voice', description: 'Write in our voice', frontmatter: null },
		},
		{
			case: 'unknown keys stay',
			frontmatter: 'name: n\ndescription: d\nlicense: MIT\nallowed-tools: Read Grep',
			expected: {
				name: 'n',
				description: 'd',
				frontmatter: { license: 'MIT', 'allowed-tools': 'Read Grep' },
			},
		},
		{
			case: 'lists and nested maps stay',
			frontmatter: 'name: n\ndescription: d\ntags: [a, b]\nmetadata:\n  team: core\n  level: 2',
			expected: {
				name: 'n',
				description: 'd',
				frontmatter: { tags: ['a', 'b'], metadata: { team: 'core', level: 2 } },
			},
		},
	])('$case', ({ frontmatter, expected }) => {
		const { content } = readSkillFolder('brand-voice', [
			{ path: 'SKILL.md', content: skillMd(frontmatter) },
		]);

		expect(content).toEqual({ ...expected, instructions: 'Use short sentences.', files: [] });
	});

	it.each([
		{ case: 'no name', frontmatter: 'description: d', expected: 'brand-voice' },
		{ case: 'an empty name', frontmatter: 'name: ""\ndescription: d', expected: 'brand-voice' },
		{
			case: 'a padded name',
			frontmatter: 'name: "  Brand voice "\ndescription: d',
			expected: 'Brand voice',
		},
	])('$case → "$expected"', ({ frontmatter, expected }) => {
		const { content } = readSkillFolder('brand-voice', [
			{ path: 'SKILL.md', content: skillMd(frontmatter) },
		]);

		expect(content.name).toBe(expected);
	});

	it.each([
		{ case: 'no SKILL.md', skill: undefined, message: 'The folder has no SKILL.md.' },
		{
			case: 'no frontmatter',
			skill: 'Use short sentences.',
			message: 'SKILL.md must start with frontmatter between two --- lines.',
		},
		{
			case: 'unclosed frontmatter',
			skill: '---\nname: n\nUse short sentences.',
			message: 'SKILL.md must start with frontmatter between two --- lines.',
		},
		{
			case: 'invalid YAML',
			skill: skillMd('name: [n\ndescription: d'),
			message: 'The SKILL.md frontmatter is not valid YAML.',
		},
		{
			case: 'frontmatter that is a list',
			skill: skillMd('- name\n- description'),
			message: 'The SKILL.md frontmatter must be a map of keys.',
		},
		{
			case: 'frontmatter that refers to itself through an alias',
			skill: skillMd('name: n\ndescription: d\nmeta: &self\n  loop: *self'),
			message: 'The SKILL.md frontmatter cannot refer to itself.',
		},
		{
			case: 'no description',
			skill: skillMd('name: n'),
			message: 'The SKILL.md frontmatter needs a description.',
		},
		{
			case: 'a blank description',
			skill: skillMd('name: n\ndescription: "  "'),
			message: 'The SKILL.md frontmatter needs a description.',
		},
		{
			case: 'no instructions',
			skill: skillMd('name: n\ndescription: d', '  \n'),
			message: 'SKILL.md needs instructions after the frontmatter.',
		},
	])('refuses $case', ({ skill, message }) => {
		const files = skill === undefined ? [] : [{ path: 'SKILL.md', content: skill }];

		const read = () => readSkillFolder('brand-voice', files);

		expect(read).toThrow(SkillParseError);
		expect(read).toThrow(message);
	});

	it('keeps a frontmatter key named instructions apart from the body', () => {
		const { content } = readSkillFolder('brand-voice', [
			{ path: 'SKILL.md', content: skillMd('name: n\ndescription: d\ninstructions: x') },
		]);

		expect(content.instructions).toBe('Use short sentences.');
		expect(content.frontmatter).toEqual({ instructions: 'x' });
	});

	it.each([
		{ case: 'CRLF', text: '---\r\nname: n\r\ndescription: d\r\n---\r\nLine 1\r\nLine 2\r\n' },
		{ case: 'CR', text: '---\rname: n\rdescription: d\r---\rLine 1\rLine 2\r' },
		{ case: 'a BOM', text: '\uFEFF---\nname: n\ndescription: d\n---\nLine 1\nLine 2\n' },
		{
			case: 'spaces after the --- lines',
			text: '--- \nname: n\ndescription: d\n---\t \nLine 1\nLine 2\n',
		},
	])('reads $case like LF', ({ text }) => {
		const read = (content: string) =>
			readSkillFolder('brand-voice', [{ path: 'SKILL.md', content }]).content;

		expect(read(text)).toEqual(read('---\nname: n\ndescription: d\n---\nLine 1\nLine 2\n'));
	});

	describe('files', () => {
		const SKILL = { path: 'SKILL.md', content: skillMd('name: n\ndescription: d') };
		const readFile = (path: string) =>
			readSkillFolder('brand-voice', [SKILL, { path, content: 'Text' }]);

		it.each([
			{ path: 'references/a.md', kept: 'references/a.md' },
			{ path: 'references/deep/a.markdown', kept: 'references/deep/a.markdown' },
			{ path: 'reference/degraded/a.md', kept: 'reference/degraded/a.md' },
			{ path: 'scripts/run.sh', kept: 'scripts/run.sh' },
			{ path: 'LICENSE', kept: 'LICENSE' },
			{ path: 'references/data.json', kept: 'references/data.json' },
		])('keeps $path as $kept', ({ path, kept }) => {
			const { content, skippedFiles } = readFile(path);

			expect(content.files).toEqual([{ path: kept, content: 'Text' }]);
			expect(skippedFiles).toEqual([]);
		});

		it.each([
			{ path: 'references/../secrets.md', skipped: 'references/../secrets.md' },
			{ path: '.\\docs\\a.md', skipped: '.\\docs\\a.md' },
			{ path: './references/a.md', skipped: './references/a.md' },
		])('skips $path', ({ path, skipped }) => {
			const { content, skippedFiles } = readFile(path);

			expect(content.files).toEqual([]);
			expect(skippedFiles).toEqual([skipped]);
		});

		// Postgres cannot store NUL, so the file stays out instead of failing the write.
		it('skips a path with a NUL character', () => {
			const { content, skippedFiles } = readFile('references/a\0.md');

			expect(content.files).toEqual([]);
			expect(skippedFiles).toEqual(['references/a\0.md']);
		});

		it('removes the byte order mark and CRLF from Markdown files only', () => {
			const { content } = readSkillFolder('brand-voice', [
				SKILL,
				{ path: 'reference/guide.MD', content: '\uFEFFLine 1\r\nLine 2\r' },
				{ path: 'notes.markdown', content: Buffer.from('\uFEFFA\r\n') },
				{ path: 'scripts/run.bat', content: '\uFEFFecho 1\r\n' },
			]);

			expect(content.files).toEqual([
				{ path: 'notes.markdown', content: 'A\n' },
				{ path: 'reference/guide.MD', content: 'Line 1\nLine 2\n' },
				{ path: 'scripts/run.bat', content: '\uFEFFecho 1\r\n' },
			]);
		});

		it('keeps a file with a text name as text when it has a byte that is not UTF-8', () => {
			// 0x92 is a quote in Windows-1252.
			const quote = Buffer.from([0x49, 0x74, 0x92, 0x73]);
			const { content } = readSkillFolder('brand-voice', [
				{ path: 'SKILL.md', content: Buffer.concat([Buffer.from(String(SKILL.content)), quote]) },
				{ path: 'assets/data.bin', content: quote },
				{ path: 'references/guide.md', content: quote },
				{ path: 'references/guide.mdx', content: quote },
				{ path: 'references/nul.md', content: Buffer.from([0x41, 0]) },
			]);

			expect(content.instructions).toContain('It\uFFFDs');
			expect(content.files).toEqual([
				{ path: 'assets/data.bin', content: quote.toString('base64'), isBinary: true },
				{ path: 'references/guide.md', content: 'It\uFFFDs' },
				{ path: 'references/guide.mdx', content: 'It\uFFFDs' },
				{ path: 'references/nul.md', content: 'QQA=', isBinary: true },
			]);
		});

		it('preserves binary bytes, empty files, and the line endings of a script', () => {
			const input = Buffer.from([0, 0xff, 0xfe, 10]);
			const { content, skippedFiles } = readSkillFolder('brand-voice', [
				SKILL,
				{ path: 'assets/logo.png', content: input },
				{ path: 'reference/empty.md', content: '' },
				{ path: 'scripts/run.sh', content: 'x\r\n' },
			]);

			expect(content.files).toEqual([
				{ path: 'assets/logo.png', content: input.toString('base64'), isBinary: true },
				{ path: 'reference/empty.md', content: '' },
				{ path: 'scripts/run.sh', content: 'x\r\n' },
			]);
			expect(skippedFiles).toEqual([]);
			expect(writeSkillFolder(content)[1].content).toEqual(input);
		});

		it.each([
			{ part: 'instructions', text: skillMd('name: n\ndescription: d', 'Use\0 this.') },
			{ part: 'description', text: skillMd('name: n\ndescription: "d\\0"') },
			{ part: 'frontmatter', text: skillMd('name: n\ndescription: d\nnote: "a\\0b"') },
		])('refuses a SKILL.md with a NUL character in the $part', ({ text }) => {
			const read = () => readSkillFolder('brand-voice', [{ path: 'SKILL.md', content: text }]);

			expect(read).toThrow(SkillParseError);
			expect(read).toThrow('SKILL.md has a NUL character, which n8n cannot store.');
		});

		it.each([
			{
				case: 'two supporting files',
				extra: ['reference/a.md', 'reference/a.md'],
				at: 'reference/a.md',
			},
			{ case: 'a second SKILL.md', extra: ['SKILL.md'], at: 'SKILL.md' },
		])('refuses two paths for one file, with $case', ({ extra, at }) => {
			const files = [SKILL, ...extra.map((path) => ({ path, content: 'x' }))];
			const read = () => readSkillFolder('brand-voice', files);

			expect(read).toThrow(SkillParseError);
			expect(read).toThrow(`The folder has more than one file at ${at}.`);
		});

		it('lists skipped files in path order', () => {
			const { content, skippedFiles } = readSkillFolder('brand-voice', [
				{ path: 'z/../run.sh', content: 'x' },
				SKILL,
				{ path: 'a/../LICENSE', content: 'x' },
				{ path: 'references/b.md', content: 'B\r\n' },
				{ path: 'references/a.md', content: 'A' },
			]);

			expect(content.files).toEqual([
				{ path: 'references/a.md', content: 'A' },
				{ path: 'references/b.md', content: 'B\n' },
			]);
			expect(skippedFiles).toEqual(['a/../LICENSE', 'z/../run.sh']);
		});
	});
});

describe('writeSkillFolder', () => {
	const content: SkillContent = {
		name: 'Brand voice',
		description: 'Write in our voice',
		instructions: 'Use short sentences.',
		frontmatter: { license: 'MIT' },
		files: [{ path: 'references/tone.md', content: 'Warm.' }],
	};

	it('writes SKILL.md with name and description first, then the references', () => {
		expect(writeSkillFolder(content)).toEqual([
			{
				path: 'SKILL.md',
				content:
					'---\nname: Brand voice\ndescription: Write in our voice\nlicense: MIT\n---\n\nUse short sentences.\n',
			},
			{ path: 'references/tone.md', content: 'Warm.' },
		]);
	});

	it('writes the real name and description, also when the frontmatter holds those keys', () => {
		const [skillFile] = writeSkillFolder({
			...content,
			frontmatter: { name: 'Old name', description: 'Old description', license: 'MIT' },
		});

		expect(skillFile.content).toBe(
			'---\nname: Brand voice\ndescription: Write in our voice\nlicense: MIT\n---\n\nUse short sentences.\n',
		);
	});

	// Skill Sync compares the hash of a fetched folder with the stored one. A folder that
	// was read once must give the same hash after each later write and read.
	it('keeps the hash of a read folder stable over a write and a read', () => {
		const messy = [
			{
				path: 'SKILL.md',
				content:
					'\uFEFF---\r\nname: "  Brand voice "\r\ndescription: Write\r\nmetadata:\r\n  team: core\r\n---\r\n\r\n  Use short sentences.  \r\n\r\n',
			},
			{ path: 'references/tone.md', content: 'Warm.\r\n' },
			{ path: 'scripts/run.sh', content: 'echo' },
		];
		const { content: first } = readSkillFolder('brand-voice', messy);

		const { content: second } = readSkillFolder('brand-voice', writeSkillFolder(first));

		expect(skillContentHash(second)).toBe(skillContentHash(first));
	});

	it.each<{ case: string; change: Partial<SkillContent> }>([
		{ case: 'no frontmatter', change: { frontmatter: null, files: [] } },
		{ case: 'a name that YAML reads as a number', change: { name: '123' } },
		{ case: 'a name with a colon', change: { name: 'Voice: brand' } },
		{ case: 'a multi-line description', change: { description: 'Line 1\nLine 2' } },
		{
			case: 'lists, nested maps and a key named instructions',
			change: {
				frontmatter: {
					'allowed-tools': ['Read', 'Grep'],
					metadata: { team: 'core', level: 2, flags: [true, null] },
					instructions: 'x',
				},
			},
		},
		{ case: 'markdown with --- in the body', change: { instructions: 'Intro\n\n---\n\nMore' } },
		{
			case: 'several references',
			change: {
				files: [
					{ path: 'references/b.md', content: 'B\n' },
					{ path: 'references/a/deep.md', content: 'A' },
				],
			},
		},
	])('reads back the same content hash with $case', ({ change }) => {
		const original = { ...content, ...change };

		const { content: readBack } = readSkillFolder('brand-voice', writeSkillFolder(original));

		expect(skillContentHash(readBack)).toBe(skillContentHash(original));
	});
});
