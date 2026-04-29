import { describe, it, expect } from 'vitest';
import {
	buildAgentConfigFingerprint,
	deriveAgentStatus,
} from '../composables/agentTelemetry.utils';
import type { AgentJsonConfig, AgentResource } from '../types';

describe('buildAgentConfigFingerprint', () => {
	const baseConfig: AgentJsonConfig = {
		name: 'x',
		model: 'gpt-4',
		instructions: 'do things',
		tools: [
			{ type: 'node', name: 'zulu' },
			{ type: 'custom', id: 'alpha' },
		],
		skills: [{ type: 'skill', id: 'summarize_notes' }],
		memory: { enabled: true, storage: 'n8n' },
	};

	it('produces a 16-char hex config_version and includes the raw instructions', async () => {
		const fp = await buildAgentConfigFingerprint(baseConfig, ['slack']);
		expect(fp.config_version).toMatch(/^[0-9a-f]{16}$/);
		expect(fp.instructions).toBe('do things');
	});

	it('sorts tools and triggers alphabetically', async () => {
		const fp = await buildAgentConfigFingerprint(baseConfig, ['telegram', 'slack']);
		expect(fp.tools).toEqual(['alpha', 'zulu']);
		expect(fp.skills).toEqual(['summarize_notes']);
		expect(fp.triggers).toEqual(['slack', 'telegram']);
	});

	it('returns the same config_version for trigger inputs in different orders', async () => {
		const a = await buildAgentConfigFingerprint(baseConfig, ['slack', 'telegram']);
		const b = await buildAgentConfigFingerprint(baseConfig, ['telegram', 'slack']);
		expect(a.config_version).toBe(b.config_version);
	});

	it('changes config_version when instructions change', async () => {
		const a = await buildAgentConfigFingerprint(baseConfig, []);
		const b = await buildAgentConfigFingerprint({ ...baseConfig, instructions: 'other' }, []);
		expect(a.config_version).not.toBe(b.config_version);
	});

	it('changes config_version when a tool is added', async () => {
		const a = await buildAgentConfigFingerprint(baseConfig, []);
		const withExtra: AgentJsonConfig = {
			...baseConfig,
			tools: [...(baseConfig.tools ?? []), { type: 'node', name: 'new-tool' }],
		};
		expect((await buildAgentConfigFingerprint(withExtra, [])).config_version).not.toBe(
			a.config_version,
		);
	});

	it('changes config_version when a skill is added', async () => {
		const a = await buildAgentConfigFingerprint(baseConfig, []);
		const withExtra: AgentJsonConfig = {
			...baseConfig,
			skills: [...(baseConfig.skills ?? []), { type: 'skill', id: 'write_like_brand' }],
		};
		expect((await buildAgentConfigFingerprint(withExtra, [])).config_version).not.toBe(
			a.config_version,
		);
	});

	it('changes config_version when the model changes', async () => {
		const a = await buildAgentConfigFingerprint(baseConfig, []);
		const b = await buildAgentConfigFingerprint({ ...baseConfig, model: 'gpt-5' }, []);
		expect(a.config_version).not.toBe(b.config_version);
	});

	it('returns null memory when config.memory is undefined', async () => {
		const fp = await buildAgentConfigFingerprint({ ...baseConfig, memory: undefined }, []);
		expect(fp.memory).toBeNull();
	});

	it('handles null config', async () => {
		const fp = await buildAgentConfigFingerprint(null, []);
		expect(fp.instructions).toBe('');
		expect(fp.tools).toEqual([]);
		expect(fp.skills).toEqual([]);
		expect(fp.model).toBeNull();
	});
});

describe('deriveAgentStatus', () => {
	it('returns draft when agent has no published version', () => {
		const agent = { publishedVersion: null, versionId: 'v1' } as unknown as AgentResource;
		expect(deriveAgentStatus(agent)).toBe('draft');
	});

	it('returns draft when published version differs from current versionId', () => {
		const agent = {
			versionId: 'v2',
			publishedVersion: { publishedFromVersionId: 'v1' },
		} as unknown as AgentResource;
		expect(deriveAgentStatus(agent)).toBe('draft');
	});

	it('returns production when current versionId matches published version', () => {
		const agent = {
			versionId: 'v1',
			publishedVersion: { publishedFromVersionId: 'v1' },
		} as unknown as AgentResource;
		expect(deriveAgentStatus(agent)).toBe('production');
	});

	it('returns draft when agent is null', () => {
		expect(deriveAgentStatus(null)).toBe('draft');
	});
});
