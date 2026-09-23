import { mock } from 'vitest-mock-extended';

import type { AgentSessionLeaseService } from '../../agent-session-lease.service';

/** A lease service that runs each callback in place, for tests that do not cover fencing. */
export function mockSessionLeases() {
	const sessionLeases = mock<AgentSessionLeaseService>();
	sessionLeases.runInTurn.mockImplementation((_executionId, fn) => fn());
	sessionLeases.runOutsideTurn.mockImplementation((fn) => fn());
	sessionLeases.fencedWrite.mockImplementation(async (ctx, write) => await write(ctx));
	return sessionLeases;
}
