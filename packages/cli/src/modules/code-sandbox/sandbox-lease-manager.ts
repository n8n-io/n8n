import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { CodeSandboxConfig } from './code-sandbox.config';
import { CodeSandboxTimings } from './code-sandbox-timings';
import { RpcChannel } from './rpc-channel';
import { TaskApiClient } from './task-api-client';

export type LeaseState = 'starting' | 'ready' | 'draining' | 'broken' | 'releasing';

export type ReleaseReason =
	| 'execution_end'
	| 'execution_waiting'
	| 'idle'
	| 'max_lifetime'
	| 'broken'
	| 'shutdown'
	| 'create_failed';

export interface Lease {
	id: number;
	scopeKey: string;
	/** The workflow of the first task. For the analysis only. */
	workflowId?: string;
	/** Empty while the sandbox is being created. */
	sandboxId: string;
	channel: RpcChannel;
	slots: number;
	/** Running tasks plus slots reserved for tasks that wait for the create. */
	activeTasks: number;
	/** Executions that use the lease now. */
	holders: Set<string>;
	/** All executions that the lease served. */
	allExecutions: Set<string>;
	createdAt: number;
	lastTaskEndedAt?: number;
	idleTimer?: NodeJS.Timeout;
	lifetimeTimer?: NodeJS.Timeout;
	state: LeaseState;
	drainReason?: ReleaseReason;
	taskCount: number;
	busyMs: number;
	busySince?: number;
	maxConcurrentTasks: number;
	ready: Promise<void>;
	createMs?: number;
	channelMs?: number;
	createTimings?: unknown;
	/** Called when the lease breaks, to fail the running tasks. */
	onBroken: Set<(reason: string) => void>;
}

interface TaskWaiter {
	executionId?: string;
	workflowId?: string;
	enqueuedAt: number;
	resolve: (result: AcquireResult) => void;
	reject: (error: Error) => void;
}

interface LeaseGroup {
	scopeKey: string;
	sandboxes: Lease[];
	waiting: TaskWaiter[];
}

export interface AcquireResult {
	lease: Lease;
	/** A ready sandbox with a free slot existed. */
	leaseHit: boolean;
	/** Time in the waiting queue of the group. */
	slotWaitMs: number;
	/** This task started the create of the sandbox. */
	createdForTask: boolean;
}

export class SandboxCreateError extends UnexpectedError {}

/**
 * Owns all code sandboxes of this n8n process. A sandbox serves one scope key
 * only. A released sandbox is deleted, never given to another key.
 */
@Service()
export class SandboxLeaseManager {
	private readonly groups = new Map<string, LeaseGroup>();

	private readonly executionLeases = new Map<string, Set<Lease>>();

	private readonly sandboxIds = new Set<string>();

	private nextLeaseId = 1;

	private clientInstance: TaskApiClient | undefined;

	private shuttingDown = false;

	constructor(
		private readonly config: CodeSandboxConfig,
		private readonly timings: CodeSandboxTimings,
		private readonly logger: Logger,
	) {}

	get client(): TaskApiClient {
		this.clientInstance ??= new TaskApiClient(this.config.serviceUrl, this.config.serviceApiKey);
		return this.clientInstance;
	}

	/** Number of live leases. For tests and logs. */
	get leaseCount() {
		let n = 0;
		for (const g of this.groups.values()) n += g.sandboxes.length;
		return n;
	}

	/** Reserves a slot for a task of the scope key. */
	async acquire(
		scopeKey: string,
		executionId: string | undefined,
		workflowId?: string,
	): Promise<AcquireResult> {
		if (this.shuttingDown) throw new SandboxCreateError('n8n is shutting down');
		let group = this.groups.get(scopeKey);
		if (!group) {
			group = { scopeKey, sandboxes: [], waiting: [] };
			this.groups.set(scopeKey, group);
		}
		const result = new Promise<AcquireResult>((resolve, reject) => {
			group.waiting.push({ executionId, workflowId, enqueuedAt: Date.now(), resolve, reject });
		});
		this.pump(group);
		return await result;
	}

	/** Frees the slot of a task. */
	onTaskEnd(lease: Lease) {
		const now = Date.now();
		if (lease.activeTasks > 0) lease.activeTasks--;
		lease.lastTaskEndedAt = now;
		if (lease.activeTasks === 0 && lease.busySince !== undefined) {
			lease.busyMs += now - lease.busySince;
			lease.busySince = undefined;
		}
		if (lease.state === 'releasing' || lease.state === 'broken') return;

		const group = this.groups.get(lease.scopeKey);
		if (lease.state === 'draining') {
			if (lease.activeTasks === 0) this.release(lease, lease.drainReason ?? 'max_lifetime');
			if (group) this.pump(group);
			return;
		}
		if (lease.activeTasks === 0) this.startIdleTimer(lease);
		if (group) this.pump(group);
	}

	/**
	 * The execution ended or went to waiting. In `node` and `execution` mode
	 * its leases are released. In `workflow` mode the execution only stops
	 * holding them: the idle timer and the max lifetime end those leases.
	 */
	releaseForExecution(executionId: string, reason: 'execution_end' | 'execution_waiting') {
		const leases = this.executionLeases.get(executionId);
		this.executionLeases.delete(executionId);
		if (!leases) return;
		for (const lease of leases) {
			lease.holders.delete(executionId);
			if (this.config.scope === 'workflow') continue;
			if (lease.state === 'releasing' || lease.state === 'broken') continue;
			if (lease.activeTasks > 0) this.drain(lease, reason);
			else this.release(lease, reason);
		}
	}

	/** Releases the lease if no task uses it. For leases of a random scope key. */
	releaseUnused(lease: Lease, reason: ReleaseReason) {
		if (lease.activeTasks === 0 && (lease.state === 'ready' || lease.state === 'draining')) {
			this.release(lease, reason);
		}
	}

	/** The lease cannot be used any more. Fails its tasks and releases it. */
	markBroken(lease: Lease, reason: string) {
		if (lease.state === 'releasing' || lease.state === 'broken') return;
		this.logger.warn('Code sandbox broken', { sandboxId: lease.sandboxId, reason });
		lease.state = 'broken';
		for (const onBroken of lease.onBroken) onBroken(reason);
		this.release(lease, 'broken');
	}

	async shutdown() {
		this.shuttingDown = true;
		for (const group of [...this.groups.values()]) {
			for (const w of group.waiting.splice(0))
				w.reject(new SandboxCreateError('n8n is shutting down'));
			for (const lease of [...group.sandboxes]) this.release(lease, 'shutdown');
		}
	}

	private pump(group: LeaseGroup) {
		while (group.waiting.length > 0) {
			let lease = group.sandboxes.find(
				(l) => (l.state === 'ready' || l.state === 'starting') && l.activeTasks < l.slots,
			);
			let created = false;
			if (!lease) {
				const live = group.sandboxes.filter(
					(l) => l.state === 'ready' || l.state === 'starting',
				).length;
				if (live >= this.config.maxPerKey) break;
				lease = this.startLease(group, group.waiting[0].workflowId);
				created = true;
			}
			const waiter = group.waiting.shift()!;
			const slotWaitMs = Date.now() - waiter.enqueuedAt;
			this.reserve(lease, waiter.executionId);
			if (lease.state === 'ready') {
				waiter.resolve({ lease, leaseHit: true, slotWaitMs, createdForTask: false });
			} else {
				const l = lease;
				l.ready.then(
					() => waiter.resolve({ lease: l, leaseHit: false, slotWaitMs, createdForTask: created }),
					(e: Error) => waiter.reject(e),
				);
			}
		}
		if (group.waiting.length === 0 && group.sandboxes.length === 0) {
			this.groups.delete(group.scopeKey);
		}
	}

	private reserve(lease: Lease, executionId: string | undefined) {
		if (lease.activeTasks === 0) {
			lease.busySince = Date.now();
			if (lease.idleTimer) {
				clearTimeout(lease.idleTimer);
				lease.idleTimer = undefined;
			}
		}
		lease.activeTasks++;
		lease.taskCount++;
		lease.maxConcurrentTasks = Math.max(lease.maxConcurrentTasks, lease.activeTasks);
		if (executionId) {
			lease.holders.add(executionId);
			lease.allExecutions.add(executionId);
			let set = this.executionLeases.get(executionId);
			if (!set) {
				set = new Set();
				this.executionLeases.set(executionId, set);
			}
			set.add(lease);
		}
	}

	private startLease(group: LeaseGroup, workflowId: string | undefined): Lease {
		const lease: Lease = {
			id: this.nextLeaseId++,
			scopeKey: group.scopeKey,
			workflowId,
			sandboxId: '',
			channel: new RpcChannel(),
			slots: this.config.slots,
			activeTasks: 0,
			holders: new Set(),
			allExecutions: new Set(),
			createdAt: Date.now(),
			state: 'starting',
			taskCount: 0,
			busyMs: 0,
			maxConcurrentTasks: 0,
			ready: Promise.resolve(),
			onBroken: new Set(),
		};
		group.sandboxes.push(lease);
		lease.ready = this.createSandbox(lease);
		lease.ready.catch((e: Error) => this.onCreateFailed(lease, e));
		return lease;
	}

	private async createSandbox(lease: Lease) {
		const t0 = Date.now();
		const sandbox = await this.client.createSandbox({
			runtime: this.config.runtime,
			slots: lease.slots,
			taskMemoryMb: this.config.taskMemoryMb,
			spareWorkers: this.config.spareWorkers,
			reuseWorkers: this.config.reuseWorkers,
			labels: { scope: this.config.scope },
		});
		lease.createMs = Date.now() - t0;
		lease.createTimings = { ...sandbox.timings, pooled: sandbox.pooled === true };
		if (this.sandboxIds.has(sandbox.id)) {
			throw new UnexpectedError('Sandbox id appears in two leases', {
				extra: { sandboxId: sandbox.id },
			});
		}
		this.sandboxIds.add(sandbox.id);
		lease.sandboxId = sandbox.id;
		if (lease.state === 'releasing') {
			throw new SandboxCreateError('The lease was released while its sandbox was created');
		}

		const t1 = Date.now();
		const open = await this.client.openChannel(sandbox.id, {
			onCall: async (call) => await lease.channel.handleCall(call),
			onClose: (reason) => this.onChannelClose(lease, reason),
		});
		lease.channel.attach(open.ws);
		lease.channelMs = Date.now() - t1;
		// The state can change while the channel opens.
		if ((lease.state as LeaseState) === 'releasing') {
			throw new SandboxCreateError('The lease was released while its channel opened');
		}
		if (lease.state === 'starting') lease.state = 'ready';
		if (this.config.scope === 'workflow') {
			const remaining = Math.max(0, this.config.maxLifetimeMs - (Date.now() - lease.createdAt));
			lease.lifetimeTimer = setTimeout(() => this.drain(lease, 'max_lifetime'), remaining);
			lease.lifetimeTimer.unref();
		}
	}

	private onCreateFailed(lease: Lease, e: Error) {
		this.logger.warn('Code sandbox create failed', { scopeKey: lease.scopeKey, error: e.message });
		if (lease.state !== 'releasing') {
			lease.state = 'broken';
			this.release(lease, 'create_failed');
		} else if (lease.sandboxId) {
			this.deleteSandbox(lease.sandboxId);
		}
	}

	private onChannelClose(lease: Lease, reason: string) {
		lease.channel.markClosed();
		if (lease.state === 'releasing') return;
		this.markBroken(lease, `channel closed: ${reason}`);
	}

	private startIdleTimer(lease: Lease) {
		if (lease.idleTimer) clearTimeout(lease.idleTimer);
		lease.idleTimer = setTimeout(() => {
			if (lease.activeTasks === 0 && lease.state === 'ready') this.release(lease, 'idle');
		}, this.config.idleTimeoutMs);
		lease.idleTimer.unref();
	}

	private drain(lease: Lease, reason: ReleaseReason) {
		if (lease.state !== 'ready' && lease.state !== 'starting') return;
		lease.state = 'draining';
		lease.drainReason = reason;
		if (lease.activeTasks === 0) this.release(lease, reason);
		const group = this.groups.get(lease.scopeKey);
		if (group) this.pump(group);
	}

	private release(lease: Lease, reason: ReleaseReason) {
		if (lease.state === 'releasing') return;
		lease.state = 'releasing';
		if (lease.idleTimer) clearTimeout(lease.idleTimer);
		if (lease.lifetimeTimer) clearTimeout(lease.lifetimeTimer);
		lease.channel.close();
		if (lease.sandboxId) this.deleteSandbox(lease.sandboxId);

		for (const executionId of lease.holders) {
			this.executionLeases.get(executionId)?.delete(lease);
		}
		const group = this.groups.get(lease.scopeKey);
		if (group) {
			group.sandboxes = group.sandboxes.filter((l) => l !== lease);
		}

		const now = Date.now();
		if (lease.busySince !== undefined) {
			lease.busyMs += now - lease.busySince;
			lease.busySince = undefined;
		}
		const holdMs = now - lease.createdAt;
		this.timings.lease({
			scopeMode: this.config.scope,
			scopeKey: lease.scopeKey,
			sandboxId: lease.sandboxId,
			workflowId: lease.workflowId,
			createMs: lease.createMs,
			channelMs: lease.channelMs,
			createdAt: lease.createdAt,
			releasedAt: now,
			holdMs,
			busyMs: lease.busyMs,
			idleRatio: holdMs > 0 ? 1 - lease.busyMs / holdMs : 0,
			taskCount: lease.taskCount,
			executionCount: lease.allExecutions.size,
			maxConcurrentTasks: lease.maxConcurrentTasks,
			slots: lease.slots,
			releaseReason: reason,
		});

		if (group) this.pump(group);
	}

	private deleteSandbox(sandboxId: string) {
		this.sandboxIds.delete(sandboxId);
		void (async () => {
			// Spike measurement: read the process count before the delete.
			if (this.config.timings) {
				try {
					const { workersStarted } = await this.client.getSandbox(sandboxId);
					this.timings.event('processes', { sandboxId, workersStarted });
				} catch {}
			}
			await this.client.deleteSandbox(sandboxId);
		})().catch((e: Error) => {
			this.logger.warn('Code sandbox delete failed', { sandboxId, error: e.message });
		});
	}
}
