import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';

import { Telemetry } from '@/telemetry';

import { createListSkillsTool, createLoadSkillTool } from '../tools/skills.tool';

const SKILL_NAME = 'deploy test n8n instance';

describe('skills MCP tools', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	const telemetry = mockInstance(Telemetry, { track: vi.fn() });

	describe('list_skills', () => {
		test('returns the name and description of each skill, without the instructions', async () => {
			const tool = createListSkillsTool(user, telemetry);

			const result = await tool.handler({});

			expect(tool.name).toBe('list_skills');
			expect(result.structuredContent).toEqual({
				skills: [
					{
						name: SKILL_NAME,
						description: 'Use when the user wants to deploy test n8n instance.',
					},
					{
						name: 'create diagram',
						description: expect.stringContaining('diagram'),
					},
				],
			});
		});
	});

	describe('load_skill', () => {
		test('returns the full instructions of the named skill', async () => {
			const tool = createLoadSkillTool(user, telemetry);

			const result = await tool.handler({ name: SKILL_NAME });

			expect(tool.name).toBe('load_skill');
			expect(result.isError).toBeUndefined();
			const [content] = result.content as Array<{ type: 'text'; text: string }>;
			expect(content.text).toContain('/nathan deploy <branch> --ai');
		});

		test('returns the instructions of the diagram skill', async () => {
			const tool = createLoadSkillTool(user, telemetry);

			const result = await tool.handler({ name: 'create diagram' });

			const [content] = result.content as Array<{ type: 'text'; text: string }>;
			expect(content.text).toContain('%% Title:');
		});

		test('matches the name without regard to case or surrounding spaces', async () => {
			const tool = createLoadSkillTool(user, telemetry);

			const result = await tool.handler({ name: '  Deploy Test n8n Instance ' });

			expect(result.isError).toBeUndefined();
		});

		test('returns an error that names the available skills for an unknown name', async () => {
			const tool = createLoadSkillTool(user, telemetry);

			const result = await tool.handler({ name: 'unknown' });

			expect(result.isError).toBe(true);
			const [content] = result.content as Array<{ type: 'text'; text: string }>;
			expect(content.text).toContain(SKILL_NAME);
		});
	});
});
