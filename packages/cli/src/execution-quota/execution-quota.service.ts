import { isBillableExecutionMode } from '@n8n/backend-services';
import { DatabaseConfig, ExecutionsConfig } from '@n8n/config';
import {
	DbLock,
	DbLockService,
	ExecutionLedgerRepository,
	ExecutionQuotaRepository,
	type ExecutionQuotaPeriod,
	type ExecutionQuotaRow,
	type ExecutionQuotaScopeType,
	type OperationContext,
} from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { OperationalError, type WorkflowExecuteMode } from 'n8n-workflow';

import { OwnershipService } from '@/services/ownership.service';

import { ExecutionQuotaExceededError } from './execution-quota-exceeded.error';
import {
	MemoryQuotaCounterStore,
	type QuotaCounterStore,
	RedisQuotaCounterStore,
} from './quota-counter.store';

/** PoC switch: `db` reads the ledger per run, `counter` checks an atomic Redis or memory counter. */
type QuotaMode = 'db' | 'counter';

/**
 * PoC switch for counter mode: `transaction` writes the started row in the execution's own
 * transaction, `separate` commits it alone right after admission.
 */
type StartedRowWrite = 'transaction' | 'separate';

/** Seeding races with eviction are rare, so a few attempts cover them. */
const MAX_COUNTER_ATTEMPTS = 3;

/** How long a process trusts its copy of the limits. Bounds how late a limit change applies. */
const LIMITS_TTL_MS = 1000;

/** How long a full scope refuses without touching the database. */
const EXHAUSTED_TTL_MS = 1000;

type LimitsSnapshot = {
	loadedAt: number;
	byWorkflow: Map<string, ExecutionQuotaRow>;
	byProject: Map<string, ExecutionQuotaRow>;
};

export type ApplicableQuota = {
	scope: { scopeType: ExecutionQuotaScopeType; scopeId: string };
	period: ExecutionQuotaPeriod;
	limit: number;
};

export type ExecutionQuotaCharge = {
	/** Writes the started row in the caller's transaction. A no-op if admission already wrote it. */
	recordStarted: (ctx: OperationContext) => Promise<void>;
	/** Undoes an admission whose execution was never created. */
	refund: () => Promise<void>;
};

const alreadyRecorded = async () => {};

type StartedEntry = { workflowId: string; projectId: string | null; mode: WorkflowExecuteMode };

type AttemptResult =
	| { admitted: true; createdAt: Date }
	| { admitted: false; quota: ApplicableQuota; used: number };

/**
 * Hard execution quotas. Admission appends a started row, commits it, then reads the total:
 * every admitted run sees all earlier admitted rows, so admissions never exceed the limit.
 * A refused run retries once, serialized per scope, so a burst cannot refuse everyone.
 */
@Service()
export class ExecutionQuotaService {
	private snapshot: LimitsSnapshot | undefined;

	private loading: Promise<LimitsSnapshot> | undefined;

	private readonly exhaustedUntil = new Map<string, number>();

	readonly mode: QuotaMode;

	private readonly startedRowWrite: StartedRowWrite =
		process.env.N8N_EXECUTION_QUOTA_STARTED_ROW === 'separate' ? 'separate' : 'transaction';

	private store: QuotaCounterStore | undefined;

	constructor(
		databaseConfig: DatabaseConfig,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly dbLockService: DbLockService,
		private readonly quotaRepository: ExecutionQuotaRepository,
		private readonly ledgerRepository: ExecutionLedgerRepository,
		private readonly ownershipService: OwnershipService,
	) {
		// The database path relies on Postgres isolation. A single SQLite main counts in memory.
		this.mode =
			process.env.N8N_EXECUTION_QUOTA_MODE === 'counter' || databaseConfig.type === 'sqlite'
				? 'counter'
				: 'db';
	}

	/** Counts the run against its workflow and project quotas, or throws if one is used up. */
	async admit(run: {
		workflowId: string;
		projectId?: string;
		mode: WorkflowExecuteMode;
	}): Promise<ExecutionQuotaCharge | undefined> {
		if (!isBillableExecutionMode(run.mode)) return undefined;

		const limits = await this.getLimits();
		if (limits.byWorkflow.size === 0 && limits.byProject.size === 0) return undefined;

		const projectId =
			run.projectId ??
			(limits.byProject.size > 0
				? (await this.ownershipService.getWorkflowProjectCached(run.workflowId)).id
				: null);

		const quotas = this.applicableQuotas(limits, run.workflowId, projectId);
		if (quotas.length === 0) return undefined;

		const entry: StartedEntry = { workflowId: run.workflowId, projectId, mode: run.mode };
		if (this.mode === 'counter') return await this.admitWithCounter(entry, quotas);

		const exhausted = quotas.find((quota) => this.isExhausted(quota));
		if (exhausted) throw this.refusal(exhausted);

		let attempt = await this.attempt(entry, quotas, {});
		if (!attempt.admitted) {
			attempt = await this.dbLockService.withSessionLocks(
				DbLock.EXECUTION_QUOTA_ADMISSION,
				quotas.map((quota) => scopeLockKey(quota.scope)),
				async (ctx) => await this.attempt(entry, quotas, ctx),
			);
		}

		if (!attempt.admitted) {
			// Without this run the scope is still full, so later runs can refuse from memory.
			if (attempt.used - 1 >= attempt.quota.limit) {
				this.exhaustedUntil.set(scopeKey(attempt.quota.scope), Date.now() + EXHAUSTED_TTL_MS);
			}
			throw this.refusal(attempt.quota);
		}

		const { createdAt } = attempt;
		return {
			recordStarted: alreadyRecorded,
			refund: async () =>
				await this.ledgerRepository.appendStartedCompensation({ ...entry, createdAt }),
		};
	}

	/**
	 * Counts the run in the atomic counter, then hands back the started row to write. The row
	 * keeps the admission time, so the fold moves it out of the period the counter charged.
	 */
	private async admitWithCounter(
		entry: StartedEntry,
		quotas: ApplicableQuota[],
	): Promise<ExecutionQuotaCharge> {
		const store = this.counterStore();
		const admittedAt = new Date();
		const keys = quotas.map((quota) => this.counterKey(quota, admittedAt));
		const limits = quotas.map((quota) => quota.limit);

		let admitted = false;
		for (let attempt = 0; attempt < MAX_COUNTER_ATTEMPTS && !admitted; attempt++) {
			const result = await store.admit(keys, limits);
			if (result.status === 'refused') throw this.refusal(quotas[result.index]);
			admitted = result.status === 'admitted';
			if (result.status === 'missing') {
				for (const index of result.indexes) {
					await this.seedCounter(quotas[index], keys[index], admittedAt);
				}
			}
		}
		if (!admitted) throw new OperationalError('Execution quota counter could not be seeded');

		const started = { ...entry, createdAt: admittedAt };
		if (this.startedRowWrite === 'transaction') {
			// Nothing reads the row to decide, so it can commit with the execution, or roll back with it.
			return {
				recordStarted: async (ctx) => {
					await this.ledgerRepository.appendStarted(started, ctx);
				},
				refund: async () => await store.release(keys),
			};
		}

		try {
			await this.ledgerRepository.appendStarted(started);
		} catch (error) {
			await store.release(keys);
			throw error;
		}
		return {
			recordStarted: alreadyRecorded,
			refund: async () => await this.ledgerRepository.appendStartedCompensation(started),
		};
	}

	private async seedCounter(quota: ApplicableQuota, key: string, at: Date) {
		const window = periodWindow(quota.period, at);
		const seed = await this.quotaRepository.counterSeed(quota.scope, window);
		// Kept a day past the period, so a late fold for it still finds the key.
		const ttlMs = window.end.getTime() - Date.now() + 24 * 60 * 60 * 1000;
		await this.counterStore().seed(key, seed, ttlMs);
	}

	counterKey(quota: ApplicableQuota, at: Date): string {
		const { start } = periodWindow(quota.period, at);
		const { scopeType, scopeId } = quota.scope;
		return `${this.counterStore().keyPrefix()}:${scopeType}:${scopeId}:${quota.period}:${start.toISOString()}`;
	}

	counterStore(): QuotaCounterStore {
		if (!this.store) {
			const useRedis =
				process.env.N8N_EXECUTION_QUOTA_COUNTER_STORE === 'redis' ||
				(process.env.N8N_EXECUTION_QUOTA_COUNTER_STORE !== 'memory' &&
					(this.executionsConfig.mode === 'queue' || this.instanceSettings.isMultiMain));
			this.store = useRedis
				? Container.get(RedisQuotaCounterStore)
				: Container.get(MemoryQuotaCounterStore);
		}
		return this.store;
	}

	/** The quotas set on a scope, read from the cached limits. */
	async quotasForScope(scope: {
		scopeType: ExecutionQuotaScopeType;
		scopeId: string;
	}): Promise<ApplicableQuota[]> {
		const limits = await this.getLimits();
		const row =
			scope.scopeType === 'workflow'
				? limits.byWorkflow.get(scope.scopeId)
				: limits.byProject.get(scope.scopeId);
		return row ? [{ scope, period: row.period, limit: row.limit }] : [];
	}

	/** Appends the started row, then checks every quota. A refused attempt cancels its row. */
	private async attempt(
		entry: StartedEntry,
		quotas: ApplicableQuota[],
		ctx: OperationContext,
	): Promise<AttemptResult> {
		const { createdAt } = await this.ledgerRepository.appendStarted(entry, ctx);
		for (const quota of quotas) {
			const window = periodWindow(quota.period, createdAt);
			const used = await this.quotaRepository.countStarted(quota.scope, window, ctx);
			if (used > quota.limit) {
				await this.ledgerRepository.appendStartedCompensation({ ...entry, createdAt }, ctx);
				return { admitted: false, quota, used };
			}
		}
		return { admitted: true, createdAt };
	}

	private isExhausted(quota: ApplicableQuota): boolean {
		const until = this.exhaustedUntil.get(scopeKey(quota.scope));
		return until !== undefined && until > Date.now();
	}

	private refusal(quota: ApplicableQuota) {
		return new ExecutionQuotaExceededError(quota.scope.scopeType, quota.period, quota.limit);
	}

	async setLimit(
		scope: { scopeType: ExecutionQuotaScopeType; scopeId: string },
		period: ExecutionQuotaPeriod,
		limit: number,
	): Promise<void> {
		await this.quotaRepository.setLimit(scope, period, limit);
		this.snapshot = undefined;
		this.exhaustedUntil.delete(scopeKey(scope));
	}

	private applicableQuotas(
		limits: LimitsSnapshot,
		workflowId: string,
		projectId: string | null,
	): ApplicableQuota[] {
		const quotas: ApplicableQuota[] = [];
		const workflowQuota = limits.byWorkflow.get(workflowId);
		if (workflowQuota) {
			quotas.push({
				scope: { scopeType: 'workflow', scopeId: workflowId },
				period: workflowQuota.period,
				limit: workflowQuota.limit,
			});
		}
		const projectQuota = projectId ? limits.byProject.get(projectId) : undefined;
		if (projectId && projectQuota) {
			quotas.push({
				scope: { scopeType: 'project', scopeId: projectId },
				period: projectQuota.period,
				limit: projectQuota.limit,
			});
		}
		return quotas;
	}

	private async getLimits(): Promise<LimitsSnapshot> {
		if (this.snapshot && Date.now() - this.snapshot.loadedAt < LIMITS_TTL_MS) return this.snapshot;

		this.loading ??= this.loadLimits().finally(() => {
			this.loading = undefined;
		});
		this.snapshot = await this.loading;
		return this.snapshot;
	}

	private async loadLimits(): Promise<LimitsSnapshot> {
		const rows = await this.quotaRepository.findAll();
		const snapshot: LimitsSnapshot = {
			loadedAt: Date.now(),
			byWorkflow: new Map(),
			byProject: new Map(),
		};
		for (const row of rows) {
			if (row.workflowId) snapshot.byWorkflow.set(row.workflowId, row);
			if (row.projectId) snapshot.byProject.set(row.projectId, row);
		}
		return snapshot;
	}
}

/** The UTC day or month that contains `at`. */
export function periodWindow(period: ExecutionQuotaPeriod, at: Date): { start: Date; end: Date } {
	const year = at.getUTCFullYear();
	const month = at.getUTCMonth();
	if (period === 'month') {
		return {
			start: new Date(Date.UTC(year, month, 1)),
			end: new Date(Date.UTC(year, month + 1, 1)),
		};
	}
	const day = at.getUTCDate();
	return {
		start: new Date(Date.UTC(year, month, day)),
		end: new Date(Date.UTC(year, month, day + 1)),
	};
}

function scopeKey(scope: { scopeType: ExecutionQuotaScopeType; scopeId: string }): string {
	return `${scope.scopeType}:${scope.scopeId}`;
}

/** FNV-1a of the scope key as an int32 advisory lock key. A collision only adds waiting. */
function scopeLockKey(scope: { scopeType: ExecutionQuotaScopeType; scopeId: string }): number {
	let hash = 0x811c9dc5;
	for (const char of scopeKey(scope)) {
		hash ^= char.charCodeAt(0);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash | 0;
}
