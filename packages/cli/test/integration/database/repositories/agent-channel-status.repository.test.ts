import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { v4 as uuid } from 'uuid';

import type { Agent } from '@/modules/agents/entities/agent.entity';
import type { AgentChannelObservation } from '@/modules/agents/repositories/agent-channel-status.repository';
import {
	AgentChannelStatusRepository,
	type AgentChannelRef,
} from '@/modules/agents/repositories/agent-channel-status.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

const CONNECTED: AgentChannelObservation = {
	status: 'connected',
	errorMessage: null,
	attempts: 0,
	backoffUntil: null,
	expiresAt: null,
};

function errored(overrides: Partial<AgentChannelObservation> = {}): AgentChannelObservation {
	return {
		status: 'error',
		errorMessage: 'boom',
		attempts: 2,
		backoffUntil: new Date('2026-01-01T00:00:00.000Z'),
		expiresAt: null,
		...overrides,
	};
}

describe('AgentChannelStatusRepository', () => {
	let statusRepo: AgentChannelStatusRepository;
	let agentRepo: AgentRepository;
	let instanceSettings: InstanceSettings;
	let agent: Agent;
	let ref: AgentChannelRef;

	/**
	 * Write a row as if another process had: `hostId` is deliberately not a
	 * parameter of the repository's own writes, so this reaches past it to set up
	 * the multi-instance cases.
	 */
	async function saveAsOtherHost(
		hostId: string,
		channel: AgentChannelRef,
		observation: AgentChannelObservation,
	) {
		await statusRepo.insert({ ...channel, hostId, ...observation });
	}

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		statusRepo = Container.get(AgentChannelStatusRepository);
		agentRepo = Container.get(AgentRepository);
		instanceSettings = Container.get(InstanceSettings);
	});

	beforeEach(async () => {
		const project = await createTeamProject();
		agent = await agentRepo.save(
			agentRepo.create({
				id: uuid(),
				name: 'Test Agent',
				projectId: project.id,
				integrations: [],
				tools: {},
				skills: {},
				versionId: 'version-1',
				activeVersionId: null,
			} as Partial<Agent>),
		);
		ref = { agentId: agent.id, integrationType: 'telegram', credentialId: 'cred-1' };
	});

	afterEach(async () => {
		await statusRepo.delete({});
		await agentRepo.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('writes this instance’s account of a channel', async () => {
		await statusRepo.saveOwn(ref, CONNECTED);

		await expect(statusRepo.findOwnChannel(ref)).resolves.toMatchObject({
			...ref,
			hostId: instanceSettings.hostId,
			status: 'connected',
			errorMessage: null,
			attempts: 0,
		});
	});

	it('replaces its own row rather than adding one', async () => {
		await statusRepo.saveOwn(ref, errored());
		await statusRepo.saveOwn(ref, CONNECTED);

		const rows = await statusRepo.findByAgentId(agent.id);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ status: 'connected', errorMessage: null, attempts: 0 });
	});

	it('round-trips the retry deadline and the lease', async () => {
		const backoffUntil = new Date('2026-06-01T12:00:00.000Z');
		const expiresAt = new Date('2026-06-01T12:05:00.000Z');

		await statusRepo.saveOwn(ref, errored({ backoffUntil, expiresAt }));

		const row = await statusRepo.findOwnChannel(ref);
		expect(row?.backoffUntil?.toISOString()).toBe(backoffUntil.toISOString());
		expect(row?.expiresAt?.toISOString()).toBe(expiresAt.toISOString());
	});

	it('caps an error message too long to be readable', async () => {
		await statusRepo.saveOwn(ref, errored({ errorMessage: 'x'.repeat(5000) }));

		const row = await statusRepo.findOwnChannel(ref);
		expect(row?.errorMessage).toHaveLength(1024);
	});

	describe('per-instance isolation', () => {
		it('keeps one row per instance for the same channel', async () => {
			await statusRepo.saveOwn(ref, CONNECTED);
			await saveAsOtherHost('main-other', ref, errored());

			const rows = await statusRepo.findByAgentId(agent.id);
			expect(rows).toHaveLength(2);
			expect(rows.map((row) => row.status).sort()).toEqual(['connected', 'error']);
		});

		it('does not overwrite another instance’s row when writing its own', async () => {
			await saveAsOtherHost('main-other', ref, errored({ errorMessage: 'their failure' }));

			await statusRepo.saveOwn(ref, CONNECTED);

			const theirs = await statusRepo.findOneBy({ ...ref, hostId: 'main-other' });
			expect(theirs).toMatchObject({ status: 'error', errorMessage: 'their failure' });
		});

		it('reads back only its own rows', async () => {
			await statusRepo.saveOwn(ref, CONNECTED);
			await saveAsOtherHost('main-other', ref, errored());

			const own = await statusRepo.findOwnAll();
			expect(own).toHaveLength(1);
			expect(own[0].hostId).toBe(instanceSettings.hostId);
		});

		it('withdraws only its own row for a channel', async () => {
			await statusRepo.saveOwn(ref, CONNECTED);
			await saveAsOtherHost('main-other', ref, CONNECTED);

			await statusRepo.clearOwnChannel(ref);

			const rows = await statusRepo.findByAgentId(agent.id);
			expect(rows).toHaveLength(1);
			expect(rows[0].hostId).toBe('main-other');
		});

		it('withdraws all of its own rows without touching anyone else’s', async () => {
			await statusRepo.saveOwn(ref, CONNECTED);
			await statusRepo.saveOwn({ ...ref, integrationType: 'slack' }, CONNECTED);
			await saveAsOtherHost('main-other', ref, CONNECTED);

			await statusRepo.clearOwnHost();

			const rows = await statusRepo.findByAgentId(agent.id);
			expect(rows).toHaveLength(1);
			expect(rows[0].hostId).toBe('main-other');
		});
	});

	describe('leases', () => {
		it('extends its own lease without disturbing the retry deadline', async () => {
			const backoffUntil = new Date('2026-06-01T12:00:00.000Z');
			await statusRepo.saveOwn(ref, errored({ backoffUntil }));

			const expiresAt = new Date('2026-06-01T13:00:00.000Z');
			await statusRepo.refreshOwnLease(ref, expiresAt);

			const row = await statusRepo.findOwnChannel(ref);
			expect(row?.expiresAt?.toISOString()).toBe(expiresAt.toISOString());
			expect(row?.backoffUntil?.toISOString()).toBe(backoffUntil.toISOString());
			expect(row?.status).toBe('error');
			expect(row?.attempts).toBe(2);
		});

		it('deletes rows past their expiry, whoever owns them', async () => {
			const past = new Date(Date.now() - 60_000);
			await saveAsOtherHost('main-dead', ref, CONNECTED);
			await saveAsOtherHost(
				'main-gone',
				{ ...ref, integrationType: 'slack' },
				{
					...CONNECTED,
					expiresAt: past,
				},
			);

			const deleted = await statusRepo.deleteExpired(new Date());

			expect(deleted).toBe(1);
			const remaining = await statusRepo.findByAgentId(agent.id);
			expect(remaining).toHaveLength(1);
			expect(remaining[0].hostId).toBe('main-dead');
		});

		it('leaves rows with no expiry alone, since nothing is refreshing them by design', async () => {
			await statusRepo.saveOwn(ref, { ...CONNECTED, expiresAt: null });

			await expect(statusRepo.deleteExpired(new Date())).resolves.toBe(0);
			await expect(statusRepo.findOwnChannel(ref)).resolves.not.toBeNull();
		});

		it('keeps a row whose lease still has time on it', async () => {
			await statusRepo.saveOwn(ref, {
				...CONNECTED,
				expiresAt: new Date(Date.now() + 60_000),
			});

			await expect(statusRepo.deleteExpired(new Date())).resolves.toBe(0);
		});
	});

	it('keeps one row per channel of an agent', async () => {
		await statusRepo.saveOwn(ref, CONNECTED);
		await statusRepo.saveOwn({ ...ref, integrationType: 'slack' }, errored());
		await statusRepo.saveOwn({ ...ref, credentialId: 'cred-2' }, CONNECTED);

		await expect(statusRepo.findByAgentId(agent.id)).resolves.toHaveLength(3);
	});

	it('goes away with its agent, including other instances’ rows', async () => {
		await statusRepo.saveOwn(ref, CONNECTED);
		await saveAsOtherHost('main-other', ref, CONNECTED);

		await agentRepo.delete({ id: agent.id });

		await expect(statusRepo.findByAgentId(agent.id)).resolves.toEqual([]);
	});
});
