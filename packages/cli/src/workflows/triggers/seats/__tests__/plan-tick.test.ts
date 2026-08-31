import type { HeldSeat, PlanTickInput, SeatView } from '../plan-tick';
import { planTick } from '../plan-tick';

const ME = 'runner-me';
const OTHER = 'runner-other';
const GRACE_MS = 60_000;

function seat(overrides: Partial<SeatView> = {}): SeatView {
	return {
		id: 'seat-1',
		workflowId: 'wf-1',
		nodeId: 'node-1',
		desiredState: 'active',
		desiredVersionId: 'v1',
		holderId: null,
		leaseExpired: false,
		leaseEpoch: 0,
		desiredHolderId: null,
		msSinceUpdated: 0,
		...overrides,
	};
}

function heldBy(_me: string, seatView: SeatView, registeredVersionId = 'v1'): [string, HeldSeat] {
	return [
		seatView.id,
		{ seatId: seatView.id, leaseEpoch: seatView.leaseEpoch, registeredVersionId },
	];
}

function plan(overrides: Partial<PlanTickInput>): ReturnType<typeof planTick> {
	return planTick({
		myRunnerId: ME,
		liveRunners: [ME],
		seats: [],
		held: new Map(),
		graceMs: GRACE_MS,
		...overrides,
	});
}

describe('planTick', () => {
	it('steady state emits only renews', () => {
		const mySeat = seat({ holderId: ME, leaseEpoch: 3 });
		const actions = plan({
			seats: [mySeat, seat({ id: 'seat-2', nodeId: 'node-2', holderId: OTHER })],
			liveRunners: [ME, OTHER],
			held: new Map([heldBy(ME, mySeat)]),
		});

		expect(actions).toEqual([{ type: 'renew', seat: mySeat, held: expect.anything() }]);
	});

	it('swaps the version in place when desire moved on', () => {
		const mySeat = seat({ holderId: ME, desiredVersionId: 'v2' });
		const actions = plan({
			seats: [mySeat],
			held: new Map([heldBy(ME, mySeat, 'v1')]),
		});

		expect(actions.map((a) => a.type)).toEqual(['swapVersion']);
	});

	it('retires a held seat that went inactive', () => {
		const mySeat = seat({ holderId: ME, desiredState: 'inactive' });
		const actions = plan({ seats: [mySeat], held: new Map([heldBy(ME, mySeat)]) });

		expect(actions.map((a) => a.type)).toEqual(['retire']);
	});

	it('honors at most one handoff request per tick, renewing the rest', () => {
		const seatA = seat({ id: 'seat-a', nodeId: 'node-a', holderId: ME, desiredHolderId: OTHER });
		const seatB = seat({ id: 'seat-b', nodeId: 'node-b', holderId: ME, desiredHolderId: OTHER });
		const actions = plan({
			seats: [seatA, seatB],
			liveRunners: [ME, OTHER],
			held: new Map([heldBy(ME, seatA), heldBy(ME, seatB)]),
		});

		expect(actions.map((a) => a.type).sort()).toEqual(['renew', 'retire']);
	});

	it('claims a vacant seat when it is the rendezvous-desired holder', () => {
		const vacant = seat();
		const actions = plan({ seats: [vacant] });

		expect(actions).toEqual([{ type: 'claim', seat: vacant }]);
	});

	it('leaves a vacant seat to its desired holder until the grace elapses', () => {
		// With two runners and one seat, exactly one is rendezvous-desired. The
		// other may only claim once the vacancy has aged past the grace.
		const vacant = seat({ msSinceUpdated: 0 });
		const aged = seat({ msSinceUpdated: GRACE_MS });

		const freshOutcomes = [ME, OTHER].map(
			(runner) =>
				planTick({
					myRunnerId: runner,
					liveRunners: [ME, OTHER],
					seats: [vacant],
					held: new Map(),
					graceMs: GRACE_MS,
				}).length,
		);
		expect(freshOutcomes.sort()).toEqual([0, 1]);

		const agedOutcomes = [ME, OTHER].map(
			(runner) =>
				planTick({
					myRunnerId: runner,
					liveRunners: [ME, OTHER],
					seats: [aged],
					held: new Map(),
					graceMs: GRACE_MS,
				}).length,
		);
		expect(agedOutcomes).toEqual([1, 1]);
	});

	it('reserves a released handoff vacancy for its requester', () => {
		const vacant = seat({ desiredHolderId: ME });
		expect(plan({ seats: [vacant], liveRunners: [ME, OTHER] })).toEqual([
			{ type: 'claim', seat: vacant },
		]);

		const notMine = seat({ desiredHolderId: OTHER });
		expect(plan({ seats: [notMine], liveRunners: [ME, OTHER] })).toEqual([]);
	});

	it('never claims a sibling seat of a trigger it already holds (anti-affinity)', () => {
		const heldSibling = seat({ id: 'seat-a', seatIndex: 0, holderId: ME } as Partial<SeatView>);
		const vacantSibling = seat({ id: 'seat-b' });
		const actions = plan({
			seats: [heldSibling, vacantSibling],
			held: new Map([heldBy(ME, heldSibling)]),
		});

		expect(actions.map((a) => a.type)).toEqual(['renew']);
	});

	it('claims an expired lease held by a dead runner', () => {
		const expired = seat({ holderId: OTHER, leaseExpired: true, leaseEpoch: 4 });
		const actions = plan({ seats: [expired], liveRunners: [ME] });

		expect(actions).toEqual([{ type: 'claim', seat: expired }]);
	});

	it('adopts a seat the row says it holds after a restart', () => {
		const mine = seat({ holderId: ME, leaseEpoch: 2 });
		const actions = plan({ seats: [mine], held: new Map() });

		expect(actions).toEqual([{ type: 'adopt', seat: mine }]);
	});

	it('deregisters a ghost when the row moved on or vanished', () => {
		const reclaimed = seat({ holderId: OTHER, leaseEpoch: 5 });
		const staleHeld: HeldSeat = { seatId: 'seat-1', leaseEpoch: 4, registeredVersionId: 'v1' };
		const goneHeld: HeldSeat = { seatId: 'seat-gone', leaseEpoch: 1, registeredVersionId: 'v1' };

		const actions = plan({
			seats: [reclaimed],
			liveRunners: [ME, OTHER],
			held: new Map([
				['seat-1', staleHeld],
				['seat-gone', goneHeld],
			]),
		});

		expect(actions).toEqual([
			{ type: 'deregisterGhost', held: staleHeld },
			{ type: 'deregisterGhost', held: goneHeld },
		]);
	});

	it('an underloaded runner requests exactly one handoff from an overloaded one', () => {
		const seats = [
			seat({ id: 's1', nodeId: 'n1', holderId: OTHER }),
			seat({ id: 's2', nodeId: 'n2', holderId: OTHER }),
			seat({ id: 's3', nodeId: 'n3', holderId: OTHER }),
			seat({ id: 's4', nodeId: 'n4', holderId: OTHER }),
		];
		const actions = plan({ seats, liveRunners: [ME, OTHER] });

		expect(actions.filter((a) => a.type === 'requestHandoff')).toHaveLength(1);
	});

	it('a balanced fleet requests no handoffs', () => {
		const seats = [
			seat({ id: 's1', nodeId: 'n1', holderId: ME }),
			seat({ id: 's2', nodeId: 'n2', holderId: OTHER }),
		];
		const actions = plan({
			seats,
			liveRunners: [ME, OTHER],
			held: new Map([heldBy(ME, seats[0])]),
		});

		expect(actions.filter((a) => a.type === 'requestHandoff')).toHaveLength(0);
	});
});
