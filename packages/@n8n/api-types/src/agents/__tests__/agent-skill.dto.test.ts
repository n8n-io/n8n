import { agentSkillSchema, CreateAgentSkillDto, UpdateAgentSkillDto } from '../dto';

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

	it('accepts SDK metadata and markdown references', () => {
		const result = agentSkillSchema.safeParse({
			...validSkill,
			allowedTools: ['load_workflow'],
			recommendedTools: ['search_docs'],
			interface: { displayName: 'Summarize notes' },
			policy: { allowImplicitInvocation: true },
			dependencies: {
				tools: ['load_workflow'],
				secrets: ['N8N_API_KEY'],
				mcpServers: [{ name: 'browser', transport: 'sse' }],
			},
			version: '1.0.0',
			license: 'MIT',
			compatibility: 'n8n >= 2',
			platforms: ['daytona'],
			metadata: { owner: 'agents' },
			references: [
				{
					path: 'references/guide.md',
					content: '# Guide',
					bytes: 7,
					sha256: 'a'.repeat(64),
				},
			],
		});

		expect(result.success).toBe(true);
	});

	it('rejects scripts and other unsupported linked file groups', () => {
		const result = CreateAgentSkillDto.safeParse({
			...validSkill,
			scripts: [{ path: 'scripts/run.py', content: 'print("hi")' }],
		});

		expect(result.success).toBe(false);
	});

	it('rejects invalid or duplicate reference paths', () => {
		expect(
			agentSkillSchema.safeParse({
				...validSkill,
				references: [
					{
						path: '../guide.md',
						content: '# Guide',
						bytes: 7,
						sha256: 'a'.repeat(64),
					},
				],
			}).success,
		).toBe(false);

		expect(
			agentSkillSchema.safeParse({
				...validSkill,
				references: [
					{
						path: 'references/guide.md',
						content: '# Guide',
						bytes: 7,
						sha256: 'a'.repeat(64),
					},
					{
						path: 'references/guide.md',
						content: '# Guide 2',
						bytes: 9,
						sha256: 'b'.repeat(64),
					},
				],
			}).success,
		).toBe(false);
	});

	it('rejects oversized instructions', () => {
		expect(
			CreateAgentSkillDto.safeParse({
				...validSkill,
				instructions: 'x'.repeat(65_537),
			}).success,
		).toBe(false);
	});
});
