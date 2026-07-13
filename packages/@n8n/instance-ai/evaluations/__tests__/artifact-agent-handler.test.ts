import type { AgentJsonConfig, AgentSkill, InstanceAiMessage } from '@n8n/api-types';
import type { Mock } from 'vitest';

import { agentNode, assistantMessage } from './fixtures';
import type { N8nClient } from '../clients/n8n-client';
import { agentHandler } from '../harness/artifacts/agent-handler';

describe('agentHandler', () => {
	it('declares its type and static execution mode', () => {
		expect(agentHandler.type).toBe('agent');
		expect(agentHandler.runsExecutionScenarios).toBe(false);
	});

	it('discover() finds ids from targetResource and ignores tool-call results (no id signal there)', () => {
		const messages: InstanceAiMessage[] = [
			assistantMessage(
				agentNode({
					targetResource: { type: 'agent', id: 'agent-from-target-resource' },
					// The real build_agent result carries no agent id, so a tool call must not
					// contribute an id — only targetResource does.
					toolCalls: [
						{
							toolCallId: 'tc-1',
							toolName: 'build_agent',
							args: {},
							result: { ok: true, config: {}, configHash: 'h', versionId: 'v1' },
							isLoading: false,
						},
					],
				}),
			),
		];

		const refs = agentHandler.discover({ messages });

		expect(refs).toEqual([{ type: 'agent', id: 'agent-from-target-resource' }]);
	});

	it('fetch() resolves the personal project, fetches config + skills, and sanitizes the config', async () => {
		const projectId = 'project-123';
		// `unsupportedLegacyField` is a top-level key AgentJsonConfigSchema doesn't
		// know about -- sanitizeAgentJsonConfig strips it. Cast is required because
		// this deliberately doesn't conform to AgentJsonConfig (that's the point).
		const rawConfig = {
			name: 'My Agent',
			model: { provider: 'anthropic', model: 'claude' },
			instructions: 'Be helpful.',
			unsupportedLegacyField: 'should-be-stripped',
		} as unknown as AgentJsonConfig;
		const skills: Record<string, AgentSkill> = {
			'skill-1': {
				name: 'Skill One',
				description: 'Does a thing',
				instructions: 'Follow these steps to do the thing.',
				references: [{ path: 'references/guide.md', content: 'Guide content here.' }],
			},
		};

		const getPersonalProjectId: Mock = vi.fn().mockResolvedValue(projectId);
		const getAgentConfig: Mock = vi.fn().mockResolvedValue(rawConfig);
		const getAgentSkills: Mock = vi.fn().mockResolvedValue(skills);
		const client = {
			getPersonalProjectId,
			getAgentConfig,
			getAgentSkills,
		} as unknown as N8nClient;

		const result = await agentHandler.fetch({ type: 'agent', id: 'agent-1' }, client);

		expect(getPersonalProjectId).toHaveBeenCalled();
		expect(getAgentConfig).toHaveBeenCalledWith(projectId, 'agent-1');
		expect(getAgentSkills).toHaveBeenCalledWith(projectId, 'agent-1');
		expect(result.skills).toBe(skills);
		expect(result.config).toMatchObject({ name: 'My Agent', instructions: 'Be helpful.' });
		expect(JSON.stringify(result.config)).not.toContain('should-be-stripped');
	});

	it('renderArtifact() surfaces skill instructions and reference content for the judge', () => {
		const output = agentHandler.renderArtifact({
			config: { name: 'My Agent' },
			skills: {
				'skill-1': {
					name: 'Skill One',
					description: 'Does a thing',
					instructions: 'UNIQUE_INSTRUCTIONS_MARKER',
					references: [{ path: 'references/guide.md', content: 'UNIQUE_REFERENCE_MARKER' }],
				},
			},
		});

		expect(output).toContain('UNIQUE_INSTRUCTIONS_MARKER');
		expect(output).toContain('UNIQUE_REFERENCE_MARKER');
	});

	it("renderArtifact() surfaces each skill's allowedTools so tool-access assertions are judgeable", () => {
		const output = agentHandler.renderArtifact({
			config: { name: 'My Agent' },
			skills: {
				'skill-1': {
					name: 'Skill One',
					description: 'Does a thing',
					instructions: 'do it',
					allowedTools: ['load_workflow', 'search_nodes'],
				},
			},
		});

		expect(output).toContain('load_workflow');
		expect(output).toContain('search_nodes');
	});

	it('renderArtifact() omits the allowedTools line when a skill declares none', () => {
		const output = agentHandler.renderArtifact({
			config: { name: 'My Agent' },
			skills: {
				'skill-1': { name: 'Skill One', description: 'd', instructions: 'i' },
			},
		});

		expect(output).not.toContain('Allowed tools');
	});
});
