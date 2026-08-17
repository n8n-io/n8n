import { z } from 'zod';

/**
 * Local view of the single process that answered a `GET /rest/cluster-info`
 * request. Because HTTP round-robins across forked mains, consecutive calls may
 * report different PIDs — that is expected.
 */
const ClusterProcessInfoSchema = z.object({
	pid: z.number(),
	role: z.enum(['main', 'worker', 'webhook']),
	isLeader: z.boolean(),
	uptimeSeconds: z.number(),
	memoryUsageMb: z.number(),
	/** Per-subsystem resolved transport (`redis` | `ipc` | `memory`). */
	transports: z.record(z.string(), z.string()),
	/** Respawns of this role, known only to the hypervisor primary; absent otherwise. */
	respawnCount: z.number().optional(),
});

export type ClusterProcessInfo = z.infer<typeof ClusterProcessInfoSchema>;

/**
 * Response of `GET /rest/cluster-info`: the process that answered (`self`) plus,
 * when running under the hypervisor, live details of every forked child
 * (`processes`, collected by the primary). `processes` is empty off-hypervisor.
 */
const ClusterInfoSchema = z.object({
	self: ClusterProcessInfoSchema,
	processes: z.array(ClusterProcessInfoSchema),
});

export type ClusterInfo = z.infer<typeof ClusterInfoSchema>;
