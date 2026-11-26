import {
	AGENT_SKILL_BINARY_CONTENT_MAX_LENGTH,
	AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_MAX_COUNT,
	AGENT_SKILL_REFERENCES_TOTAL_MAX_LENGTH,
	SKILL_READ_MAX_BYTES,
	agentSkillReferencePathSchema,
	agentSkillSchema,
	projectSkillDetailsForModel,
	projectSkillForModel,
} from '../agent-skill.schema';
import { CreateAgentSkillDto, UpdateAgentSkillDto } from '../dto';
import { CreateSkillDto } from '../skills.schema';

describe('agent skill DTOs', () => {
	const validSkill = {
		name: 'Summarize Notes',
		description: 'Summarizes meeting notes',
		instructions: 'Extract decisions and action items.',
	};

	it('accepts natural-language descriptions', () => {
		expect(CreateAgentSkillDto.safeParse(validSkill).success).toBe(true);
		expect(
			UpdateAgentSkillDto.safeParse({
				description: 'Extracts decisions from notes',
			}).success,
		).toBe(true);
	});

	it('accepts allowed tools and markdown references without derived file metadata', () => {
		const result = agentSkillSchema.safeParse({
			...validSkill,
			allowedTools: ['load_workflow'],
			references: [
				{
					path: 'references/guide.md',
					content: '# Guide',
				},
				{ path: 'reference/degraded/guide.md', content: '' },
				{ path: 'scripts/example.py', content: 'print(1)' },
				{ path: 'assets/logo.png', content: 'AP8=', isBinary: true },
				{ path: 'LICENSE', content: 'MIT' },
				{ path: 'examples/nested/SKILL.md', content: 'Example' },
			],
		});

		expect(result.success).toBe(true);
	});

	it('rejects removed metadata fields', () => {
		expect(agentSkillSchema.safeParse({ ...validSkill, recommendedTools: [] }).success).toBe(false);
		expect(UpdateAgentSkillDto.safeParse({ metadata: {} }).success).toBe(false);
		expect(
			agentSkillSchema.safeParse({
				...validSkill,
				references: [
					{
						path: 'references/guide.md',
						content: '# Guide',
						bytes: 7,
					},
				],
			}).success,
		).toBe(false);
	});

	it('rejects invalid or duplicate reference paths', () => {
		expect(
			CreateAgentSkillDto.safeParse({
				...validSkill,
				references: [
					{
						path: 'references/guide.md',
						content: '# Guide',
					},
					{
						path: 'references/guide.md',
						content: '# Guide 2',
					},
				],
			}).success,
		).toBe(false);
	});

	it('rejects a reference path with a control character', () => {
		for (const path of ['references/a\0.md', 'references/a\nb.md', 'references/\u001b[31ma.md']) {
			expect(agentSkillReferencePathSchema.safeParse(path).success).toBe(false);
		}
		expect(agentSkillReferencePathSchema.safeParse('references/a b.md').success).toBe(true);
	});

	it.each(['assets/report\u202Efdp.exe', 'assets/a\u200Bb.md', 'assets/\u2066a.md', '\uFEFFa.md'])(
		'rejects path %j with a hidden character',
		(path) => expect(agentSkillReferencePathSchema.safeParse(path).success).toBe(false),
	);

	// Persian and Indic scripts use these two characters inside words.
	it.each(['references/راهنمای\u200Cکاربر.md', 'references/क्\u200Dष.md'])(
		'accepts path %j with a zero width joiner or non-joiner',
		(path) => expect(agentSkillReferencePathSchema.safeParse(path).success).toBe(true),
	);

	it('accepts a lower case skill.md below the skill root', () => {
		expect(agentSkillReferencePathSchema.safeParse('examples/skill.md').success).toBe(true);
	});

	it.each([
		'../guide.md',
		'docs/../guide.md',
		'/guide.md',
		'C:/guide.md',
		'a\\b.md',
		'a//b',
		'SKILL.md',
		'SKILL.md/guide.md',
		'skill.md',
		'Skill.MD',
	])('rejects noncanonical or reserved path %s', (path) =>
		expect(agentSkillReferencePathSchema.safeParse(path).success).toBe(false),
	);

	// The Agent Skills format allows descriptions of up to 1024 characters, so skills from
	// GitHub fit without cuts.
	it.each([
		{ length: 1024, accepted: true },
		{ length: 1025, accepted: false },
	])('a description of $length characters → accepted $accepted', ({ length, accepted }) => {
		expect(
			agentSkillSchema.safeParse({ ...validSkill, description: 'x'.repeat(length) }).success,
		).toBe(accepted);
	});

	it('measures the instructions limit in characters, not UTF-8 bytes', () => {
		expect(
			agentSkillSchema.safeParse({
				...validSkill,
				instructions: 'x'.repeat(AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH),
			}).success,
		).toBe(true);

		expect(
			agentSkillSchema.safeParse({
				...validSkill,
				instructions: 'x'.repeat(AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH + 1),
			}).success,
		).toBe(false);

		// '€' is 3 UTF-8 bytes but one character, so content that used to blow
		// the byte cap now fits — the editor's counter and the limit agree.
		expect(
			agentSkillSchema.safeParse({
				...validSkill,
				instructions: '€'.repeat(AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH),
			}).success,
		).toBe(true);
	});

	it('rejects oversized or too many references', () => {
		expect(
			CreateAgentSkillDto.safeParse({
				...validSkill,
				references: [
					{
						path: 'references/guide.md',
						content: 'x'.repeat(AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH + 1),
					},
				],
			}).success,
		).toBe(false);

		expect(
			CreateAgentSkillDto.safeParse({
				...validSkill,
				references: Array.from({ length: AGENT_SKILL_REFERENCE_MAX_COUNT + 1 }, (_, index) => ({
					path: `references/${index}.md`,
					content: '# Guide',
				})),
			}).success,
		).toBe(false);
	});

	describe('file content rules', () => {
		const accepts = (references: unknown[]) =>
			agentSkillSchema.safeParse({ ...validSkill, references }).success;
		const half = AGENT_SKILL_REFERENCES_TOTAL_MAX_LENGTH / 2;

		it('rejects text with a NUL character', () => {
			expect(accepts([{ path: 'a.txt', content: 'a\0b' }])).toBe(false);
		});

		it('rejects binary content that is not Base64', () => {
			expect(accepts([{ path: 'a.bin', content: 'not base64', isBinary: true }])).toBe(false);
		});

		it('rejects isBinary false, so text has one stored form', () => {
			expect(accepts([{ path: 'a.txt', content: 'a', isBinary: false }])).toBe(false);
		});

		it('accepts binary content at the limit and rejects one Base64 group more', () => {
			const atLimit = 'A'.repeat(AGENT_SKILL_BINARY_CONTENT_MAX_LENGTH);
			expect(accepts([{ path: 'a.bin', content: atLimit, isBinary: true }])).toBe(true);
			expect(accepts([{ path: 'a.bin', content: `${atLimit}AAAA`, isBinary: true }])).toBe(false);
		});

		it('accepts two text files at the total limit and rejects one character more', () => {
			const first = { path: 'a.txt', content: 'x'.repeat(half) };
			expect(accepts([first, { path: 'b.txt', content: 'x'.repeat(half) }])).toBe(true);
			expect(accepts([first, { path: 'b.txt', content: 'x'.repeat(half + 1) }])).toBe(false);
		});

		it('counts the Base64 length of a binary file toward the total', () => {
			const binary = { path: 'a.bin', content: 'A'.repeat(half), isBinary: true };
			expect(accepts([binary, { path: 'b.txt', content: 'x'.repeat(half) }])).toBe(true);
			expect(accepts([binary, { path: 'b.txt', content: 'x'.repeat(half + 1) }])).toBe(false);
		});

		it('accepts the maximum number of files', () => {
			const references = Array.from({ length: AGENT_SKILL_REFERENCE_MAX_COUNT }, (_, index) => ({
				path: `files/${index}.md`,
				content: '',
			}));
			expect(accepts(references)).toBe(true);
		});
	});

	it.each(['', '   ', '\n\t'])('rejects instructions %j without text', (instructions) => {
		expect(agentSkillSchema.safeParse({ ...validSkill, instructions }).success).toBe(false);
		expect(CreateAgentSkillDto.safeParse({ ...validSkill, instructions }).success).toBe(false);
		expect(UpdateAgentSkillDto.safeParse({ instructions }).success).toBe(false);
		expect(
			CreateSkillDto.safeParse({ scope: 'instance', skill: { ...validSkill, instructions } })
				.success,
		).toBe(false);
	});

	it('allows empty arrays on update so list fields can be cleared', () => {
		expect(
			UpdateAgentSkillDto.safeParse({
				allowedTools: [],
			}).success,
		).toBe(true);
	});
});

describe('projectSkillForModel', () => {
	const baseSkill = {
		name: 'Multilingual Skill',
		description: 'Reads long documents',
		instructions: 'Follow the references.',
	};

	it('pages a 132,000-character Traditional Chinese reference within SKILL_READ_MAX_BYTES without losing text', () => {
		const original = '繁體中文測試內容'.repeat(16_500);
		expect(original.length).toBe(132_000);
		const skill = {
			...baseSkill,
			references: [{ path: 'references/zh.md', content: original }],
		};

		let offset: number | undefined;
		let rebuilt = '';
		let pages = 0;

		do {
			const page = projectSkillDetailsForModel(skill, {
				referencePath: 'references/zh.md',
				referenceOffset: offset,
			});
			const serializedBytes = Buffer.byteLength(JSON.stringify(page), 'utf8');
			expect(serializedBytes).toBeLessThanOrEqual(SKILL_READ_MAX_BYTES);

			const ref = page.skill.references?.[0];
			expect(ref).toBeDefined();
			expect('content' in ref!).toBe(true);
			if ('content' in ref! && typeof ref.content === 'string') {
				rebuilt += ref.content;
			}
			const nextOffset = 'nextOffset' in ref! ? ref.nextOffset : undefined;
			if (nextOffset !== undefined) {
				expect(nextOffset).toBeGreaterThan(offset ?? 0);
			}
			offset = nextOffset;
			pages += 1;
		} while (offset !== undefined);

		expect(pages).toBeGreaterThan(1);
		expect(rebuilt).toBe(original);
	});

	it('accounts for JSON escaping and surrogate pairs at page boundaries', () => {
		const original = '"\\\n\u0001😀'.repeat(10_000);
		const skill = {
			...baseSkill,
			references: [{ path: 'references/escaped.md', content: original }],
		};

		let offset: number | undefined;
		let rebuilt = '';

		do {
			const page = projectSkillDetailsForModel(skill, {
				referencePath: 'references/escaped.md',
				referenceOffset: offset,
			});
			expect(Buffer.byteLength(JSON.stringify(page), 'utf8')).toBeLessThanOrEqual(
				SKILL_READ_MAX_BYTES,
			);
			const ref = page.skill.references?.[0];
			const part = ref && 'content' in ref && typeof ref.content === 'string' ? ref.content : '';
			// Never leaves an unpaired high or low surrogate at page boundaries.
			expect(part).not.toMatch(
				/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/,
			);
			rebuilt += part;
			offset = ref && 'nextOffset' in ref ? ref.nextOffset : undefined;
		} while (offset !== undefined);

		expect(rebuilt).toBe(original);
	});

	it('reserves space for omittedReferencePaths when truncating the first reference', () => {
		const references = [
			{ path: 'references/000.md', content: 'x'.repeat(SKILL_READ_MAX_BYTES) },
			...Array.from({ length: 100 }, (_, index) => ({
				path: `references/${String(index + 1).padStart(3, '0')}.md`,
				content: 'small',
			})),
		];
		const result = projectSkillForModel(
			{ ...baseSkill, references },
			{ maxBytes: SKILL_READ_MAX_BYTES },
		);

		expect(Buffer.byteLength(JSON.stringify(result), 'utf8')).toBeLessThanOrEqual(
			SKILL_READ_MAX_BYTES,
		);
		expect(result.truncated).toBe(true);
		expect(result.omittedReferencePaths).toHaveLength(100);
	});

	it('still makes progress on an explicit reference read when instructions alone exceed SKILL_READ_MAX_BYTES', () => {
		const skill = {
			...baseSkill,
			instructions: 'a'.repeat(50_000),
			references: [{ path: 'references/guide.md', content: 'b'.repeat(20_000) }],
		};

		const first = projectSkillDetailsForModel(skill, { referencePath: 'references/guide.md' });
		const firstRef = first.skill.references?.[0];
		expect(firstRef).toMatchObject({ contentTruncated: true });
		const nextOffset = firstRef && 'nextOffset' in firstRef ? firstRef.nextOffset : undefined;
		expect(nextOffset).toBeGreaterThan(0);

		const second = projectSkillDetailsForModel(skill, {
			referencePath: 'references/guide.md',
			referenceOffset: nextOffset,
		});
		const secondRef = second.skill.references?.[0];
		const secondNext = secondRef && 'nextOffset' in secondRef ? secondRef.nextOffset : undefined;
		expect(secondNext ?? 20_000).toBeGreaterThan(nextOffset!);
	});
});
