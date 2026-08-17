import type { ClusterProcessInfo } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import type { SupervisorInfoClient } from '@/scaling/hypervisor-supervisor-info';

import { ClusterInfoController } from '../cluster-info.controller';

const LOCAL: Omit<ClusterProcessInfo, 'respawnCount'> = {
	pid: 111,
	role: 'main',
	isLeader: true,
	uptimeSeconds: 12,
	memoryUsageMb: 64,
	transports: { cache: 'memory', leaderElection: 'ipc' },
};

describe('ClusterInfoController', () => {
	const makeController = (
		respawnCount: number | undefined,
		processes: ClusterProcessInfo[] | undefined,
	) => {
		const supervisorInfo = mock<SupervisorInfoClient>();
		supervisorInfo.buildLocalInfo.mockReturnValue({ ...LOCAL });
		supervisorInfo.getRespawnCount.mockResolvedValue(respawnCount);
		supervisorInfo.getAllProcesses.mockResolvedValue(processes);

		return new ClusterInfoController(supervisorInfo);
	};

	it('reports self from the local build plus its respawn count', async () => {
		const info = await makeController(3, []).getClusterInfo();

		expect(info.self).toEqual({ ...LOCAL, respawnCount: 3 });
		expect(info.processes).toEqual([]);
	});

	it('omits respawnCount on self when the primary is not reachable', async () => {
		const info = await makeController(undefined, undefined).getClusterInfo();

		expect(info.self).not.toHaveProperty('respawnCount');
	});

	it('returns the aggregated processes from the primary', async () => {
		const other: ClusterProcessInfo = { ...LOCAL, pid: 222, isLeader: false, memoryUsageMb: 80 };
		const info = await makeController(0, [{ ...LOCAL, respawnCount: 0 }, other]).getClusterInfo();

		expect(info.processes).toHaveLength(2);
		expect(info.processes[1]).toEqual(other);
	});

	it('falls back to an empty process list off-hypervisor', async () => {
		const info = await makeController(undefined, undefined).getClusterInfo();

		expect(info.processes).toEqual([]);
	});
});
