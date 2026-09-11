import type { AgentJsonConfig, AgentSkill } from '@n8n/api-types';
import type { Mock } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import {
	AGENT_ARTIFACT_ITERATION_CAP_BYTES,
	sanitizeAgentArtifact,
} from '../harness/artifacts/agent-artifact';
import { agentHandler } from '../harness/artifacts/agent-handler';
import type { ArtifactRef } from '../types';

const validConfig = {
	name: 'My Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Triage requests.',
};

describe('agentHandler', () => {
	it('declares its type and static execution mode', () => {
		expect(agentHandler.type).toBe('agent');
		expect(agentHandler.runsExecutionScenarios).toBe(false);
	});

	it('discover() selects the agent refs captured from the SSE stream and ignores other types', () => {
		const artifactRefs: ArtifactRef[] = [
			{ type: 'agent', id: 'agent-1' },
			{ type: 'config-eval', id: 'wf-1' },
			{ type: 'agent', id: 'agent-2' },
		];

		const refs = agentHandler.discover({ artifactRefs });

		expect(refs).toEqual([
			{ type: 'agent', id: 'agent-1' },
			{ type: 'agent', id: 'agent-2' },
		]);
	});

	it('fetch() resolves the personal project and returns a redacted structured preview artifact', async () => {
		const projectId = 'project-123';
		// Future fields must survive in the raw preview even when this checkout's
		// AgentJsonConfig type does not know them yet.
		const rawConfig = {
			...validConfig,
			instructions: 'Use sk-abc123DEF456ghi789jkl012 when needed.',
			futureDisplayMode: { density: 'compact' },
		} as unknown as AgentJsonConfig;
		const skills = {
			'skill-1': {
				name: 'Skill One',
				description: 'Does a thing',
				instructions: 'Send api_key=skill-secret.',
				references: [
					{
						path: 'references/guide.md',
						content: 'Authorization: Bearer abcdef1234567890',
						futureFormat: 'markdown-v2',
					},
				],
				futurePolicy: { mode: 'strict' },
			},
		} as unknown as Record<string, AgentSkill>;

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
		expect(result.agentId).toBe('agent-1');
		expect(result.config).toMatchObject({
			name: 'My Agent',
			instructions: 'Use [REDACTED] when needed.',
			futureDisplayMode: { density: 'compact' },
		});
		expect(result.skills['skill-1']).toMatchObject({
			instructions: 'Send [REDACTED]',
			references: [
				{
					path: 'references/guide.md',
					content: 'Authorization: [REDACTED]',
					futureFormat: 'markdown-v2',
				},
			],
			futurePolicy: { mode: 'strict' },
		});
		const serialized = JSON.stringify(result);
		expect(serialized).not.toContain('skill-secret');
		expect(serialized).not.toContain('abcdef1234567890');
	});

	it('rejects an artifact when a configured skill body is missing', async () => {
		const projectId = 'project-123';
		const getPersonalProjectId: Mock = vi.fn().mockResolvedValue(projectId);
		const getAgentConfig: Mock = vi.fn().mockResolvedValue({
			...validConfig,
			skills: [{ type: 'skill', id: 'missing-skill' }],
		});
		const getAgentSkills: Mock = vi.fn().mockResolvedValue({});
		const client = {
			getPersonalProjectId,
			getAgentConfig,
			getAgentSkills,
		} as unknown as N8nClient;

		await expect(agentHandler.fetch({ type: 'agent', id: 'agent-1' }, client)).rejects.toThrow(
			'Agent agent-1 preview could not be sanitized',
		);
	});

	it('rejects malformed known config fields', () => {
		expect(
			sanitizeAgentArtifact({
				config: { ...validConfig, model: { provider: 'anthropic' } },
				skills: {},
			}),
		).toBeNull();
	});

	it('rejects artifacts over the per-iteration UTF-8 byte cap', () => {
		const instructions = '界'.repeat(Math.ceil(AGENT_ARTIFACT_ITERATION_CAP_BYTES / 3));
		expect(
			sanitizeAgentArtifact({
				config: { ...validConfig, instructions },
				skills: {},
			}),
		).toBeNull();
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
