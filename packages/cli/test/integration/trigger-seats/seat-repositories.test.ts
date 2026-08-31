import { testDb } from '@n8n/backend-test-utils';
import type { WorkflowTriggerSeat } from '@n8n/db';
import { TriggerRunnerRepository, WorkflowTriggerSeatRepository } from '@n8n/db';
import { Container } from '@n8n/di';

// Exercises the seat lease semantics directly against the database: claims bump
// the fencing epoch, every other write is guarded on holder+epoch, and the
// fence assertion only passes for the live holder at the desired version.
describe('trigger seat repositories', () => {
	let seatRepository: WorkflowTriggerSeatRepository;
	let runnerRepository: TriggerRunnerRepository;

	const LEASE_MS = 30_000;
	const EXPIRED_LEASE_MS = -1_000;

	beforeAll(async () => {
		await testDb.init();
		seatRepository = Container.get(WorkflowTriggerSeatRepository);
		runnerRepository = Container.get(TriggerRunnerRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowTriggerSeat', 'TriggerRunner']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createSeat(
		overrides: Partial<WorkflowTriggerSeat> = {},
	): Promise<WorkflowTriggerSeat> {
		await seatRepository.upsertDesiredSeats(
			overrides.workflowId ?? 'wf-1',
			overrides.nodeId ?? 'node-1',
			1,
			overrides.desiredVersionId ?? 'v1',
		);
		const seat = await seatRepository.findOneOrFail({
			where: { workflowId: overrides.workflowId ?? 'wf-1', nodeId: overrides.nodeId ?? 'node-1' },
		});
		return seat;
	}

	describe('claim', () => {
		it('claims a vacant seat and bumps the epoch', async () => {
			const seat = await createSeat();
			expect(seat.leaseEpoch).toBe(0);

			const epoch = await seatRepository.claim(seat.id, 'runner-a', LEASE_MS);

			expect(epoch).toBe(1);
			const after = await seatRepository.findOneOrFail({ where: { id: seat.id } });
			expect(after.holderId).toBe('runner-a');
			expect(after.leaseExpiresAt).not.toBeNull();
		});

		it('refuses a seat held with a live lease', async () => {
			const seat = await createSeat();
			await seatRepository.claim(seat.id, 'runner-a', LEASE_MS);

			const epoch = await seatRepository.claim(seat.id, 'runner-b', LEASE_MS);

			expect(epoch).toBeNull();
		});

		it('reclaims a seat whose lease expired, bumping the epoch again', async () => {
			const seat = await createSeat();
			await seatRepository.claim(seat.id, 'runner-a', EXPIRED_LEASE_MS);

			const epoch = await seatRepository.claim(seat.id, 'runner-b', LEASE_MS);

			expect(epoch).toBe(2);
			const after = await seatRepository.findOneOrFail({ where: { id: seat.id } });
			expect(after.holderId).toBe('runner-b');
		});

		it('refuses an inactive seat', async () => {
			const seat = await createSeat();
			await seatRepository.markSeatsInactive(seat.workflowId, [seat.nodeId]);

			const epoch = await seatRepository.claim(seat.id, 'runner-a', LEASE_MS);

			expect(epoch).toBeNull();
		});
	});

	describe('renew / release / reportActual', () => {
		it('renews only for the current holder and epoch', async () => {
			const seat = await createSeat();
			const epoch = await seatRepository.claim(seat.id, 'runner-a', LEASE_MS);

			expect(await seatRepository.renew(seat.id, 'runner-a', epoch!, LEASE_MS)).toBe(true);
			expect(await seatRepository.renew(seat.id, 'runner-a', epoch! - 1, LEASE_MS)).toBe(false);
			expect(await seatRepository.renew(seat.id, 'runner-b', epoch!, LEASE_MS)).toBe(false);
		});

		it('release vacates without bumping the epoch; the next claim bumps it', async () => {
			const seat = await createSeat();
			const epoch = await seatRepository.claim(seat.id, 'runner-a', LEASE_MS);

			expect(await seatRepository.release(seat.id, 'runner-a', epoch!)).toBe(true);
			const vacated = await seatRepository.findOneOrFail({ where: { id: seat.id } });
			expect(vacated.holderId).toBeNull();
			expect(vacated.leaseEpoch).toBe(1);

			expect(await seatRepository.claim(seat.id, 'runner-b', LEASE_MS)).toBe(2);
		});

		it('reportActual is guarded on holder and epoch', async () => {
			const seat = await createSeat();
			const epoch = await seatRepository.claim(seat.id, 'runner-a', LEASE_MS);

			expect(
				await seatRepository.reportActual(seat.id, 'runner-a', epoch!, {
					state: 'registered',
					versionId: 'v1',
				}),
			).toBe(true);
			expect(
				await seatRepository.reportActual(seat.id, 'runner-b', epoch!, { state: 'closed' }),
			).toBe(false);

			const after = await seatRepository.findOneOrFail({ where: { id: seat.id } });
			expect(after.actualState).toBe('registered');
			expect(after.actualVersionId).toBe('v1');
		});
	});

	describe('assertSeatHeld (the fence)', () => {
		it('passes for the live holder at the desired version', async () => {
			const seat = await createSeat({ desiredVersionId: 'v1' });
			const epoch = await seatRepository.claim(seat.id, 'runner-a', LEASE_MS);

			const held = await seatRepository.assertSeatHeld(
				{ seatId: seat.id, holderId: 'runner-a', leaseEpoch: epoch!, versionId: 'v1' },
				{},
			);

			expect(held).toBe(true);
		});

		it('rejects a zombie whose seat was reclaimed', async () => {
			const seat = await createSeat();
			const staleEpoch = await seatRepository.claim(seat.id, 'runner-a', EXPIRED_LEASE_MS);
			await seatRepository.claim(seat.id, 'runner-b', LEASE_MS);

			const held = await seatRepository.assertSeatHeld(
				{ seatId: seat.id, holderId: 'runner-a', leaseEpoch: staleEpoch!, versionId: 'v1' },
				{},
			);

			expect(held).toBe(false);
		});

		it('still passes for a holder whose lease expired but was not reclaimed', async () => {
			// Epoch-not-expiry: only a newer claim revokes, never the clock alone.
			const seat = await createSeat();
			const epoch = await seatRepository.claim(seat.id, 'runner-a', EXPIRED_LEASE_MS);

			const held = await seatRepository.assertSeatHeld(
				{ seatId: seat.id, holderId: 'runner-a', leaseEpoch: epoch!, versionId: 'v1' },
				{},
			);

			expect(held).toBe(true);
		});

		it('rejects when the desired version moved on', async () => {
			const seat = await createSeat({ desiredVersionId: 'v1' });
			const epoch = await seatRepository.claim(seat.id, 'runner-a', LEASE_MS);
			await seatRepository.upsertDesiredSeats(seat.workflowId, seat.nodeId, 1, 'v2');

			const held = await seatRepository.assertSeatHeld(
				{ seatId: seat.id, holderId: 'runner-a', leaseEpoch: epoch!, versionId: 'v1' },
				{},
			);

			expect(held).toBe(false);
		});

		it('rejects when the seat went inactive', async () => {
			const seat = await createSeat();
			const epoch = await seatRepository.claim(seat.id, 'runner-a', LEASE_MS);
			await seatRepository.markSeatsInactive(seat.workflowId, [seat.nodeId]);

			const held = await seatRepository.assertSeatHeld(
				{ seatId: seat.id, holderId: 'runner-a', leaseEpoch: epoch!, versionId: 'v1' },
				{},
			);

			expect(held).toBe(false);
		});
	});

	describe('upsertDesiredSeats', () => {
		it('creates N seats and marks shrunk leftovers inactive', async () => {
			await seatRepository.upsertDesiredSeats('wf-1', 'node-1', 3, 'v1');
			expect(await seatRepository.count({ where: { desiredState: 'active' } })).toBe(3);

			await seatRepository.upsertDesiredSeats('wf-1', 'node-1', 1, 'v1');

			const seats = await seatRepository.find({ order: { seatIndex: 'ASC' } });
			expect(seats.map((seat) => seat.desiredState)).toEqual(['active', 'inactive', 'inactive']);
		});

		it('retargets the version without touching an existing lease', async () => {
			const seat = await createSeat({ desiredVersionId: 'v1' });
			const epoch = await seatRepository.claim(seat.id, 'runner-a', LEASE_MS);

			await seatRepository.upsertDesiredSeats(seat.workflowId, seat.nodeId, 1, 'v2');

			const after = await seatRepository.findOneOrFail({ where: { id: seat.id } });
			expect(after.desiredVersionId).toBe('v2');
			expect(after.holderId).toBe('runner-a');
			expect(after.leaseEpoch).toBe(epoch);
		});
	});

	describe('requestHandoff', () => {
		it('sets the request once, and never toward the current holder', async () => {
			const seat = await createSeat();
			await seatRepository.claim(seat.id, 'runner-a', LEASE_MS);

			expect(await seatRepository.requestHandoff(seat.id, 'runner-a')).toBe(false);
			expect(await seatRepository.requestHandoff(seat.id, 'runner-b')).toBe(true);
			expect(await seatRepository.requestHandoff(seat.id, 'runner-c')).toBe(false);
		});
	});

	describe('trigger runner registry', () => {
		it('heartbeat upserts and liveness filters by TTL', async () => {
			await runnerRepository.heartbeat('runner-a');
			await runnerRepository.heartbeat('runner-b');
			await runnerRepository.heartbeat('runner-a');

			expect(await runnerRepository.findLiveRunnerIds(60_000)).toEqual(['runner-a', 'runner-b']);
			expect(await runnerRepository.findLiveRunnerIds(-1_000)).toEqual([]);
		});
	});
});
