import {
	InlineAgentConfigSchema,
	InlineAgentJsonConfigSchema,
	RunnableInlineAgentConfigSchema,
} from '../inline-agent-config.schema';

const baseConfig = {
	name: 'Inline Agent',
	model: 'anthropic/claude-sonnet-4-5',
	credential: 'cred-1',
	instructions: 'Help users',
};

describe('InlineAgentJsonConfigSchema', () => {
	it('accepts the minimal inline shape', () => {
		expect(InlineAgentJsonConfigSchema.safeParse(baseConfig).success).toBe(true);
	});

	it('accepts workflow and node tools', () => {
		const result = InlineAgentJsonConfigSchema.safeParse({
			...baseConfig,
			tools: [
				{ type: 'workflow', workflow: 'Lookup Orders' },
				{
					type: 'node',
					name: 'HTTP Request',
					node: {
						nodeType: 'n8n-nodes-base.httpRequestTool',
						nodeTypeVersion: 4.4,
						nodeParameters: { url: 'https://example.com' },
					},
				},
			],
		});
		expect(result.success).toBe(true);
	});

	it('accepts mcpServers (deliberately in inline scope)', () => {
		const result = InlineAgentJsonConfigSchema.safeParse({
			...baseConfig,
			mcpServers: [{ name: 'docs', url: 'https://mcp.example.com' }],
		});
		expect(result.success).toBe(true);
	});

	it('rejects custom (code) tools — their bodies live on saved agents', () => {
		const result = InlineAgentJsonConfigSchema.safeParse({
			...baseConfig,
			tools: [{ type: 'custom', id: 'my_tool' }],
		});
		expect(result.success).toBe(false);
	});

	it.each([
		['workflow', { type: 'workflow', workflow: 'Lookup Orders', requireApproval: true }],
		[
			'node',
			{
				type: 'node',
				name: 'HTTP Request',
				requireApproval: true,
				node: {
					nodeType: 'n8n-nodes-base.httpRequestTool',
					nodeTypeVersion: 4.4,
					nodeParameters: {},
				},
			},
		],
	])(
		'rejects requireApproval on %s tools — suspension cannot resume in workflow context',
		(_type, tool) => {
			const result = InlineAgentJsonConfigSchema.safeParse({ ...baseConfig, tools: [tool] });
			expect(result.success).toBe(false);
		},
	);

	it.each([
		['memory', { memory: { enabled: true, storage: 'n8n' } }],
		['subAgents', { subAgents: [{ id: 'a' }] }],
		['config options block', { config: { webSearch: { enabled: true } } }],
	])('rejects saved-agent-only keys (%s) via strict parsing', (_key, extra) => {
		expect(InlineAgentJsonConfigSchema.safeParse({ ...baseConfig, ...extra }).success).toBe(false);
	});

	it('accepts skill refs and rejects duplicate ids', () => {
		expect(
			InlineAgentJsonConfigSchema.safeParse({
				...baseConfig,
				skills: [{ type: 'skill', id: 'triage' }],
			}).success,
		).toBe(true);
		expect(
			InlineAgentJsonConfigSchema.safeParse({
				...baseConfig,
				skills: [
					{ type: 'skill', id: 'triage' },
					{ type: 'skill', id: 'triage' },
				],
			}).success,
		).toBe(false);
	});

	it('enforces name bounds (1..128)', () => {
		expect(InlineAgentJsonConfigSchema.safeParse({ ...baseConfig, name: '' }).success).toBe(false);
		expect(
			InlineAgentJsonConfigSchema.safeParse({ ...baseConfig, name: 'x'.repeat(128) }).success,
		).toBe(true);
		expect(
			InlineAgentJsonConfigSchema.safeParse({ ...baseConfig, name: 'x'.repeat(129) }).success,
		).toBe(false);
	});

	it('accepts a draft (empty model, no credential)', () => {
		const result = InlineAgentJsonConfigSchema.safeParse({
			...baseConfig,
			model: '',
			credential: undefined,
		});
		expect(result.success).toBe(true);
	});
});

const validSkillBody = {
	name: 'Triage',
	description: 'Triage incoming requests',
	instructions: 'Categorize the request and route it.',
};

describe('RunnableInlineAgentConfigSchema', () => {
	it('accepts a runnable config', () => {
		expect(RunnableInlineAgentConfigSchema.safeParse({ config: baseConfig }).success).toBe(true);
	});

	it.each([
		['empty model', { ...baseConfig, model: '' }],
		['missing credential', { ...baseConfig, credential: undefined }],
		['whitespace-only credential', { ...baseConfig, credential: '   ' }],
	])('rejects an unrunnable draft (%s)', (_case, config) => {
		expect(RunnableInlineAgentConfigSchema.safeParse({ config }).success).toBe(false);
	});

	it('enforces skill ref/body integrity like the draft schema', () => {
		expect(
			RunnableInlineAgentConfigSchema.safeParse({
				config: { ...baseConfig, skills: [{ type: 'skill', id: 'triage' }] },
			}).success,
		).toBe(false);
		expect(
			RunnableInlineAgentConfigSchema.safeParse({
				config: { ...baseConfig, skills: [{ type: 'skill', id: 'triage' }] },
				skills: { triage: validSkillBody },
			}).success,
		).toBe(true);
	});
});

describe('InlineAgentConfigSchema', () => {
	it('rejects unknown wrapper keys', () => {
		const result = InlineAgentConfigSchema.safeParse({ config: baseConfig, extra: true });
		expect(result.success).toBe(false);
	});

	it('accepts skill refs with matching bodies, including allowedTools and references', () => {
		const result = InlineAgentConfigSchema.safeParse({
			config: { ...baseConfig, skills: [{ type: 'skill', id: 'skill_abc' }] },
			skills: {
				skill_abc: {
					...validSkillBody,
					allowedTools: ['lookup_orders'],
					references: [{ path: 'references/guide.md', content: '# Guide' }],
				},
			},
		});
		expect(result.success).toBe(true);
	});

	it('rejects a ref without a body, with a pathed message', () => {
		const result = InlineAgentConfigSchema.safeParse({
			config: { ...baseConfig, skills: [{ type: 'skill', id: 'missing' }] },
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const issue = result.error.issues[0];
			expect(issue.path).toEqual(['config', 'skills', 0, 'id']);
			expect(issue.message).toContain('has no body');
		}
	});

	it('tolerates an orphan body (no ref) — pruned by the editor, ignored by the runtime', () => {
		const result = InlineAgentConfigSchema.safeParse({
			config: baseConfig,
			skills: { orphan: validSkillBody },
		});
		expect(result.success).toBe(true);
	});

	it('rejects referenced bodies with duplicate names (case-insensitive, trimmed), with a pathed message', () => {
		const result = InlineAgentConfigSchema.safeParse({
			config: {
				...baseConfig,
				skills: [
					{ type: 'skill', id: 'skill_a' },
					{ type: 'skill', id: 'skill_b' },
				],
			},
			skills: {
				skill_a: validSkillBody,
				skill_b: { ...validSkillBody, name: ` ${validSkillBody.name.toUpperCase()} ` },
			},
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const issue = result.error.issues[0];
			expect(issue.path).toEqual(['skills', 'skill_b', 'name']);
			expect(issue.message).toContain('same name');
		}
	});

	it('accepts distinct referenced names and ignores an orphan sharing a name', () => {
		const result = InlineAgentConfigSchema.safeParse({
			config: {
				...baseConfig,
				skills: [
					{ type: 'skill', id: 'skill_a' },
					{ type: 'skill', id: 'skill_b' },
				],
			},
			skills: {
				skill_a: validSkillBody,
				skill_b: { ...validSkillBody, name: 'Escalation' },
				// Orphans are outside the uniqueness scope: the runtime never
				// attaches them, so a colliding name cannot conflict.
				orphan: validSkillBody,
			},
		});
		expect(result.success).toBe(true);
	});

	it.each([
		['missing instructions', { name: 'Triage', description: 'Triage requests' }],
		['unknown body key', { ...validSkillBody, extra: true }],
		['oversize instructions', { ...validSkillBody, instructions: 'x'.repeat(65_537) }],
	])('rejects an invalid skill body (%s)', (_case, body) => {
		const result = InlineAgentConfigSchema.safeParse({
			config: { ...baseConfig, skills: [{ type: 'skill', id: 'skill_abc' }] },
			skills: { skill_abc: body },
		});
		expect(result.success).toBe(false);
	});

	it.each([['__proto__'], ['constructor'], ['prototype'], ['bad key!']])(
		'rejects an illegal skill record key (%s)',
		(key) => {
			const result = InlineAgentConfigSchema.safeParse({
				config: baseConfig,
				// fromEntries defines own properties, so `__proto__` stays a data key
				// (an object literal would set the prototype instead).
				skills: Object.fromEntries([[key, validSkillBody]]),
			});
			expect(result.success).toBe(false);
		},
	);
});
