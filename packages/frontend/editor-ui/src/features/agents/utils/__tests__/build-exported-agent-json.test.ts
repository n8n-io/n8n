import type { AgentJsonConfig, AgentTaskDto } from '@n8n/api-types';

import { buildExportedAgentJson } from '../build-exported-agent-json';

const config: AgentJsonConfig = {
	name: 'Support Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help users',
	tasks: [{ type: 'task', id: 'task_weekly', enabled: true }],
	skills: [{ type: 'skill', id: 'skill_summarize' }],
	tools: [
		{ type: 'custom', id: 'my_tool', requireApproval: true },
		{ type: 'workflow', workflow: 'Lookup' },
	],
};

const skillBody = {
	name: 'Summarize',
	description: 'Summarise threads',
	instructions: 'Read and summarise.',
};

const taskBody: AgentTaskDto = {
	id: 'task_weekly',
	name: 'Weekly review',
	objective: 'Summarise the week',
	cronExpression: '0 9 * * 1',
	createdAt: '2025-01-01T00:00:00Z',
	updatedAt: '2025-01-01T00:00:00Z',
};

describe('buildExportedAgentJson', () => {
	it('inlines task, skill, and custom tool bodies from the builder data', () => {
		const { config: exported, missing } = buildExportedAgentJson(config, {
			skills: { skill_summarize: skillBody },
			tools: { my_tool: { code: 'export default tool' } },
			tasks: [taskBody],
		});

		expect(missing).toEqual([]);

		expect(exported.tasks?.[0]).toEqual({
			type: 'task',
			id: 'task_weekly',
			enabled: true,
			name: 'Weekly review',
			objective: 'Summarise the week',
			cronExpression: '0 9 * * 1',
		});
		expect(exported.skills?.[0]).toEqual({
			type: 'skill',
			id: 'skill_summarize',
			...skillBody,
		});
		expect(exported.tools?.[0]).toEqual({
			type: 'custom',
			id: 'my_tool',
			requireApproval: true,
			code: 'export default tool',
		});
		// Non-custom tools pass through untouched.
		expect(exported.tools?.[1]).toEqual({ type: 'workflow', workflow: 'Lookup' });
	});

	it('leaves refs bare and reports them as missing when no body is available', () => {
		const { config: exported, missing } = buildExportedAgentJson(config, {
			skills: {},
			tools: {},
			tasks: [],
		});

		expect(exported.tasks?.[0]).toEqual({ type: 'task', id: 'task_weekly', enabled: true });
		expect(exported.skills?.[0]).toEqual({ type: 'skill', id: 'skill_summarize' });
		expect(exported.tools?.[0]).toEqual({ type: 'custom', id: 'my_tool', requireApproval: true });
		expect(missing).toEqual([
			{ kind: 'task', id: 'task_weekly' },
			{ kind: 'skill', id: 'skill_summarize' },
			{ kind: 'tool', id: 'my_tool' },
		]);
	});

	it('does not report non-custom tools as missing', () => {
		const { missing } = buildExportedAgentJson(
			{
				...config,
				tasks: undefined,
				skills: undefined,
				tools: [{ type: 'workflow', workflow: 'Lookup' }],
			},
			{ skills: {}, tools: {}, tasks: [] },
		);

		expect(missing).toEqual([]);
	});

	it('does not resolve skill or tool bodies through Object.prototype keys', () => {
		const { config: exported } = buildExportedAgentJson(
			{
				...config,
				skills: [{ type: 'skill', id: 'constructor' }],
				tools: [{ type: 'custom', id: 'constructor' }],
			},
			{ skills: {}, tools: {}, tasks: [] },
		);

		expect(exported.skills?.[0]).toEqual({ type: 'skill', id: 'constructor' });
		expect(exported.tools?.[0]).toEqual({ type: 'custom', id: 'constructor' });
	});

	it('keeps sections absent when the config omits them', () => {
		const { config: exported, missing } = buildExportedAgentJson(
			{ name: 'A', model: '', instructions: '' },
			{ skills: {}, tools: {}, tasks: [] },
		);

		expect(missing).toEqual([]);

		expect(exported.tasks).toBeUndefined();
		expect(exported.skills).toBeUndefined();
		expect(exported.tools).toBeUndefined();
	});
});
