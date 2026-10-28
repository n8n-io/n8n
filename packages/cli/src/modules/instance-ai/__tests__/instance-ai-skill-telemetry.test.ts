import { createRuntimeSkillSource, extendRuntimeSkillSource } from '@n8n/agents';
import type { InstanceAiEvent } from '@n8n/api-types';
import { suspendedInstanceContextSchema } from '@n8n/instance-ai';

import { InstanceAiSkillTelemetry } from '../instance-ai-skill-telemetry';

const runtimeId = `hub-${'a'.repeat(64)}`;
const base = { runId: 'run-1', agentId: 'orchestrator:run-1' };
function source() {
	return createRuntimeSkillSource([
		{
			id: runtimeId,
			name: 'Private name',
			description: 'Private description',
			instructions: 'Secret instructions',
			metadata: { hubSkillId: 'skill-1' },
		},
		{ id: 'builder', name: 'builder', description: 'Built in', instructions: 'Built in' },
	]);
}
function call(
	key: string,
	args: Record<string, unknown> = { skillId: runtimeId },
): InstanceAiEvent {
	return { ...base, type: 'tool-call', payload: { toolCallId: key, toolName: 'load_skill', args } };
}
function result(key: string, output: unknown): InstanceAiEvent {
	return { ...base, type: 'tool-result', payload: { toolCallId: key, result: output } };
}
function setup() {
	const skills = source();
	const telemetry = new InstanceAiSkillTelemetry(base.agentId);
	telemetry.bind(skills);
	return { skills, telemetry };
}

describe('Assistant Hub skill telemetry', () => {
	it('counts failed attempts and thrown errors without recording their text', () => {
		const { telemetry } = setup();
		telemetry.observe(call('failed'));
		telemetry.observe(
			result('failed', {
				success: false,
				errorCode: 'temporarily_unavailable',
				error: 'private network error',
			}),
		);
		telemetry.observe(call('thrown'));
		telemetry.observe({
			...base,
			type: 'tool-error',
			payload: { toolCallId: 'thrown', error: 'private exception' },
		});
		const payload = telemetry.snapshot();
		expect(payload).toMatchObject({
			hub_skill_attempt_count: 2,
			hub_skill_failure_count: 2,
			hub_skill_load_count: 0,
			hub_skill_attempted_ids: ['skill-1'],
			hub_skill_failures: [
				{ operation: 'main', reason: 'temporarily_unavailable', count: 1 },
				{ operation: 'main', reason: 'tool_error', count: 1 },
			],
		});
		expect(JSON.stringify(payload)).not.toMatch(/private|Secret|instructions|exception/i);
	});

	it('separates main loads from references and pending attempts', () => {
		const { telemetry } = setup();
		telemetry.observe(call('main'));
		telemetry.observe(
			result('main', { success: true, skillId: runtimeId, content: 'Secret instructions' }),
		);
		telemetry.observe(call('ref', { skillId: runtimeId, filePath: 'references/guide.md' }));
		telemetry.observe(
			result('ref', {
				success: true,
				filePath: 'references/guide.md',
				content: 'Secret reference',
			}),
		);
		telemetry.observe(
			call('missing-ref', { skillId: runtimeId, filePath: 'references/missing.md' }),
		);
		telemetry.observe(result('missing-ref', { success: false, filePath: 'references/missing.md' }));
		telemetry.observe(call('pending'));
		expect(telemetry.snapshot()).toMatchObject({
			hub_skill_attempt_count: 2,
			hub_skill_load_count: 1,
			hub_skill_loaded_ids: ['skill-1'],
			hub_skill_failure_count: 0,
			hub_skill_reference_attempt_count: 2,
			hub_skill_reference_read_count: 1,
			hub_skill_reference_failure_count: 1,
		});
	});

	it('excludes built-ins, other agents, and unresolvable names', () => {
		const { telemetry } = setup();
		telemetry.observe(call('builtin', { skillId: 'builder' }));
		telemetry.observe({ ...call('other'), agentId: 'other' });
		telemetry.observe(call('unknown', { name: 'user text' }));
		expect(telemetry.snapshot().hub_skill_attempt_count).toBe(0);
		telemetry.observe(call('by-name', { name: 'Private name' }));
		telemetry.observe(result('by-name', { success: false }));
		expect(telemetry.snapshot().hub_skill_attempted_ids).toEqual(['skill-1']);
	});

	it('uses the same name fallback as the runtime when the supplied ID is unknown', () => {
		const { telemetry } = setup();
		telemetry.observe(call('fallback', { skillId: 'stale-id', name: 'Private name' }));
		telemetry.observe(result('fallback', { success: true, skillId: runtimeId }));
		expect(telemetry.snapshot()).toMatchObject({
			hub_skill_attempt_count: 1,
			hub_skill_loaded_ids: ['skill-1'],
		});
	});

	it('counts requests for missing Hub IDs without shipping arbitrary model input', () => {
		const { telemetry } = setup();
		telemetry.observe(call('missing', { skillId: `hub-${'b'.repeat(64)}` }));
		telemetry.observe(result('missing', { success: false }));
		telemetry.observe(call('text', { skillId: 'hub-private prompt' }));
		expect(telemetry.snapshot()).toMatchObject({
			hub_skill_attempt_count: 1,
			hub_skill_failure_count: 1,
			hub_skill_attempted_ids: [],
		});
	});

	it('keeps carry-forward, refresh, revocation, and temporary failure distinct', () => {
		const { skills, telemetry } = setup();
		const usage = [
			{ skillId: runtimeId, version: 'v1', kind: 'carried' as const },
			{ skillId: runtimeId, version: 'v2', kind: 'refreshed' as const },
			{ skillId: `hub-${'c'.repeat(64)}`, kind: 'revoked' as const },
			{ skillId: `hub-${'d'.repeat(64)}`, kind: 'unavailable' as const },
		];
		skills.onContext?.(usage);
		skills.onContext?.(usage);
		expect(telemetry.snapshot()).toMatchObject({
			hub_skill_carried_count: 1,
			hub_skill_carried_ids: ['skill-1'],
			hub_skill_refresh_count: 1,
			hub_skill_refreshed_ids: ['skill-1'],
			hub_skill_revocation_count: 1,
			hub_skill_unavailable_count: 1,
			hub_skill_attempt_count: 0,
		});
	});

	it('retains deduplication through a checkpoint and a rebound runtime', () => {
		const { skills, telemetry } = setup();
		const extended = extendRuntimeSkillSource(skills, [
			{ id: 'extra', name: 'extra', description: 'extra', instructions: 'extra' },
		]);
		telemetry.observe(call('first'));
		telemetry.observe(result('first', { success: true }));
		expect(telemetry.snapshot().hub_skill_snapshot_sequence).toBe(1);
		const checkpoint = suspendedInstanceContextSchema.parse(
			structuredClone({
				injection: { state: 'absent', reason: 'disabled' },
				instanceContextEnabled: false,
				nodeUsageEnabled: false,
				reachSoFar: { surfaces: [] },
				hubSkills: telemetry.save(),
			}),
		);
		const resumed = new InstanceAiSkillTelemetry(base.agentId, checkpoint.hubSkills);
		resumed.bind(skills);
		resumed.observe(call('first'));
		resumed.observe(result('first', { success: true }));
		extended.onContext?.([{ skillId: runtimeId, version: 'v1', kind: 'carried' }]);
		resumed.observe(call('second'));
		resumed.observe(result('second', { success: false }));
		expect(resumed.snapshot()).toMatchObject({
			hub_skill_snapshot_sequence: 2,
			hub_skill_attempt_count: 2,
			hub_skill_load_count: 1,
			hub_skill_failure_count: 1,
			hub_skill_carried_count: 0,
		});
	});
});
