// The `agent-snapshot` trace event. Mirrors the `compiled-workflow` tests in
// `tools/workflows/__tests__/build-workflow.tool.test.ts`.
import type { AgentJsonConfig, AgentSkill } from '@n8n/api-types';
import { describe, expect, it, vi } from 'vitest';

import type { InstanceAiTraceContext } from '../../types';
import { emitAgentSnapshotTraceEvent } from '../agent-snapshot-event';

const CONFIG = {
	name: 'Support Triage',
	instructions: 'You triage inbound support tickets.',
} as unknown as AgentJsonConfig;

const SKILLS: Record<string, AgentSkill> = {
	skill_triage_rules: {
		name: 'Triage rules',
		instructions: 'Assign every ticket exactly one severity.',
	} as unknown as AgentSkill,
};

function makeTracing() {
	const actorRun = { id: 'actor-run-1' };
	const startChildRun = vi.fn<
		(parent: unknown, init: Record<string, unknown>) => Promise<{ id: string }>
	>(async () => await Promise.resolve({ id: 'snapshot-run-1' }));
	const finishRun = vi.fn<(run: { id: string }, opts: Record<string, unknown>) => Promise<void>>(
		async () => await Promise.resolve(),
	);
	const tracing = { actorRun, startChildRun, finishRun } as unknown as InstanceAiTraceContext;
	return { tracing, actorRun, startChildRun, finishRun };
}

const BASE = {
	agentId: 'TrIaGe1234567890',
	projectId: 'proj-1',
	reason: 'attached' as const,
};

describe('emitAgentSnapshotTraceEvent', () => {
	it('emits a trace-only child run carrying the config and skills', async () => {
		const { tracing, actorRun, startChildRun, finishRun } = makeTracing();

		const outcome = await emitAgentSnapshotTraceEvent(tracing, {
			...BASE,
			artifact: { config: CONFIG, skills: SKILLS, configHash: 'hash-1' },
		});

		expect(outcome).toBe('emitted');
		expect(startChildRun).toHaveBeenCalledTimes(1);
		const [parentRun, init] = startChildRun.mock.calls[0];
		expect(parentRun).toBe(actorRun);
		expect(init).toMatchObject({
			name: 'agent-snapshot',
			// Bookkeeping span: a tool-typed run reads as a real agent tool call.
			runType: 'chain',
			metadata: {
				agent_id: BASE.agentId,
				config_hash: 'hash-1',
				snapshot_reason: 'attached',
				// Lifts the export scrubber's structural depth cap for this payload.
				raw_trace_payload: true,
			},
		});
		const [, finishOpts] = finishRun.mock.calls[0];
		expect(finishOpts).toMatchObject({
			rawOutputs: true,
			outputs: {
				agentId: BASE.agentId,
				projectId: 'proj-1',
				configHash: 'hash-1',
				reason: 'attached',
				config: CONFIG,
				skills: SKILLS,
			},
		});
	});

	it('emits a truncated marker instead of an oversized payload', async () => {
		const { tracing, startChildRun, finishRun } = makeTracing();
		const huge = {
			name: 'Fat Agent',
			instructions: 'x'.repeat(1_000_001),
		} as unknown as AgentJsonConfig;

		const outcome = await emitAgentSnapshotTraceEvent(tracing, {
			...BASE,
			artifact: { config: huge, configHash: 'hash-big' },
		});

		expect(outcome).toBe('emitted');
		expect(startChildRun).toHaveBeenCalledTimes(1);
		const [, finishOpts] = finishRun.mock.calls[0];
		// The marker records that a state existed without shipping a rejected run.
		expect(finishOpts.outputs).toEqual({
			agentId: BASE.agentId,
			projectId: 'proj-1',
			configHash: 'hash-big',
			reason: 'attached',
			truncated: true,
		});
		expect(finishOpts).not.toHaveProperty('rawOutputs');
	});

	it('emits one event per agent+hash on a trace, so two triggers agree', async () => {
		// Attach + target baselines both fire when a turn attaches then edits.
		const { tracing, startChildRun } = makeTracing();
		const artifact = { config: CONFIG, configHash: 'hash-1' };

		expect(await emitAgentSnapshotTraceEvent(tracing, { ...BASE, artifact })).toBe('emitted');
		expect(
			await emitAgentSnapshotTraceEvent(tracing, {
				...BASE,
				reason: 'target-resolved',
				artifact,
			}),
		).toBe('duplicate');
		expect(startChildRun).toHaveBeenCalledTimes(1);
	});

	it('emits again once the config actually changes', async () => {
		const { tracing, startChildRun } = makeTracing();

		await emitAgentSnapshotTraceEvent(tracing, {
			...BASE,
			artifact: { config: CONFIG, configHash: 'hash-1' },
		});
		const outcome = await emitAgentSnapshotTraceEvent(tracing, {
			...BASE,
			reason: 'config-updated',
			artifact: { config: CONFIG, configHash: 'hash-2' },
		});

		expect(outcome).toBe('emitted');
		expect(startChildRun).toHaveBeenCalledTimes(2);
	});

	it('emits without a hash rather than treating one snapshot as a duplicate', async () => {
		const { tracing, startChildRun } = makeTracing();
		const artifact = { config: CONFIG, configHash: null };

		expect(await emitAgentSnapshotTraceEvent(tracing, { ...BASE, artifact })).toBe('emitted');
		expect(await emitAgentSnapshotTraceEvent(tracing, { ...BASE, artifact })).toBe('emitted');
		// No hash means no dedupe key — better a duplicate row than a lost state.
		expect(startChildRun).toHaveBeenCalledTimes(2);
	});

	it('reports a broken exporter as skipped instead of failing the caller', async () => {
		// Tracing is bookkeeping: a broken exporter must not fail an agent build.
		// The tracing layer swallows its own error, so this reads as "exported
		// nothing" rather than as a bug here.
		const tracing = {
			actorRun: { id: 'actor-run-1' },
			startChildRun: vi.fn(async () => await Promise.reject(new Error('exporter down'))),
			finishRun: vi.fn(),
		} as unknown as InstanceAiTraceContext;

		await expect(
			emitAgentSnapshotTraceEvent(tracing, {
				...BASE,
				artifact: { config: CONFIG, configHash: 'hash-1' },
			}),
		).resolves.toBe('skipped');
	});

	it('retries after a skip instead of burning the hash on a trace that exported nothing', async () => {
		const { tracing, startChildRun } = makeTracing();
		const artifact = { config: CONFIG, configHash: 'hash-1' };
		startChildRun.mockRejectedValueOnce(new Error('exporter down'));

		expect(await emitAgentSnapshotTraceEvent(tracing, { ...BASE, artifact })).toBe('skipped');
		expect(await emitAgentSnapshotTraceEvent(tracing, { ...BASE, artifact })).toBe('emitted');
		expect(startChildRun).toHaveBeenCalledTimes(2);
	});

	it('retries after a failure instead of burning the hash', async () => {
		const { tracing, startChildRun } = makeTracing();
		const circular: Record<string, unknown> = { name: 'Looper' };
		circular.self = circular;

		expect(
			await emitAgentSnapshotTraceEvent(tracing, {
				...BASE,
				artifact: { config: circular as unknown as AgentJsonConfig, configHash: 'hash-1' },
			}),
		).toBe('failed');
		expect(
			await emitAgentSnapshotTraceEvent(tracing, {
				...BASE,
				artifact: { config: CONFIG, configHash: 'hash-1' },
			}),
		).toBe('emitted');
		expect(startChildRun).toHaveBeenCalledTimes(1);
	});

	it('reports a config it cannot serialize as failed, without throwing', async () => {
		const { tracing } = makeTracing();
		const circular: Record<string, unknown> = { name: 'Looper' };
		circular.self = circular;

		await expect(
			emitAgentSnapshotTraceEvent(tracing, {
				...BASE,
				artifact: { config: circular as unknown as AgentJsonConfig, configHash: 'hash-1' },
			}),
		).resolves.toBe('failed');
	});
});
