import type {
	OperatorLogFilter,
	OperatorLogHost,
	OperatorLogLevel,
	OperatorLogReadResult,
	OperatorLogRole,
	OperatorLogSearchResult,
} from '@n8n/api-types';
import { OPERATOR_LOG_LEVELS } from '@n8n/api-types';
import { LOG_SCOPES, type LogScope } from '@n8n/config';
import { AuthenticatedRequest } from '@n8n/db';
import { Delete, Get, GlobalScope, Post, RestController } from '@n8n/decorators';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { DistributedSearchService } from './consumer/distributed-search.service';
import { LogConsumerService } from './consumer/log-consumer.service';
import { OperatorConsoleConfig } from './operator-console.config';
import { CompositeLogSource } from './sources/composite-log.source';

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;

const LEVELS = new Set<string>(OPERATOR_LOG_LEVELS);
const SCOPES = new Set<string>(LOG_SCOPES);
const ROLES = new Set<string>(['main', 'worker', 'webhook']);

type LogsQuery = {
	since?: string;
	limit?: string;
	direction?: string;
	minLevel?: string;
	scopes?: string;
	hostIds?: string;
	roles?: string;
	executionId?: string;
	grep?: string;
};

/**
 * Raw instance logs are admin-only: they carry URLs, headers and error payload
 * fragments. `orchestration:read` is in `GLOBAL_OWNER_SCOPES` and inherited by
 * admin, but not granted to members.
 */
@RestController('/operator-console')
export class OperatorConsoleController {
	constructor(
		private readonly source: CompositeLogSource,
		private readonly consumer: LogConsumerService,
		private readonly config: OperatorConsoleConfig,
		private readonly distributedSearch: DistributedSearchService,
	) {}

	/**
	 * Static facts the console needs to render its filter bar. `LOG_SCOPES` lives
	 * in `@n8n/config`, a backend package the browser bundle cannot import, so
	 * without this the scope picker could only offer scopes already seen in the
	 * stream — an empty list on a fresh console.
	 */
	@Get('/meta')
	@GlobalScope('orchestration:read')
	async meta(): Promise<{ scopes: LogScope[]; levels: OperatorLogLevel[]; leaseTtlMs: number }> {
		return {
			scopes: [...LOG_SCOPES],
			levels: [...OPERATOR_LOG_LEVELS],
			leaseTtlMs: this.config.leaseTtlMs,
		};
	}

	@Get('/hosts')
	@GlobalScope('orchestration:read')
	async hosts(): Promise<OperatorLogHost[]> {
		return await this.source.hosts();
	}

	@Get('/logs')
	@GlobalScope('orchestration:read')
	async logs(req: AuthenticatedRequest<{}, {}, {}, LogsQuery>): Promise<OperatorLogReadResult> {
		const { since, limit, direction } = req.query;

		if (direction !== undefined && direction !== 'forward' && direction !== 'backward') {
			throw new BadRequestError('direction must be "forward" or "backward"');
		}

		return await this.source.read({
			since,
			limit: parseLimit(limit),
			direction,
			filter: parseFilter(req.query),
		});
	}

	/**
	 * Distributed grep over deep history: every host searches its own rotated
	 * `n8n.log` in parallel and the answers are merged here. Takes the same
	 * comma-separated filter params as `/logs`.
	 *
	 * Unlike `/logs` this reports who answered and who did not. Past the
	 * cross-host stream's window a silent worker takes its whole history with it,
	 * and "no matches" must not be indistinguishable from "two hosts never
	 * replied".
	 */
	@Get('/search')
	@GlobalScope('orchestration:read')
	async search(req: AuthenticatedRequest<{}, {}, {}, LogsQuery>): Promise<OperatorLogSearchResult> {
		const hosts = await this.source.hosts();

		return await this.distributedSearch.search({
			filter: parseFilter(req.query),
			limit: parseLimit(req.query.limit),
			expectedHostIds: hosts.map((host) => host.hostId),
		});
	}

	/**
	 * Starts or renews this session's tail lease. Returns the TTL so the client
	 * can derive its own renewal interval rather than hardcoding a margin against
	 * a server default it cannot see.
	 */
	@Post('/tail')
	@GlobalScope('orchestration:read')
	async startTail(
		req: AuthenticatedRequest<{}, {}, OperatorLogFilter>,
	): Promise<{ leaseTtlMs: number }> {
		this.consumer.open(pushRefOf(req), sanitizeFilter(req.body ?? {}));

		return { leaseTtlMs: this.config.leaseTtlMs };
	}

	@Delete('/tail')
	@GlobalScope('orchestration:read')
	async stopTail(req: AuthenticatedRequest): Promise<{ success: true }> {
		this.consumer.close(pushRefOf(req));

		return { success: true };
	}
}

/**
 * The lease is keyed on the push session, not the user: one admin may have the
 * console open in two tabs, and closing one must not silence the other.
 */
function pushRefOf(req: AuthenticatedRequest): string {
	const pushRef = req.headers['push-ref'];

	if (typeof pushRef !== 'string' || pushRef === '') {
		throw new BadRequestError('The "push-ref" header is required to tail logs');
	}

	return pushRef;
}

function parseLimit(raw: string | undefined): number {
	if (raw === undefined) return DEFAULT_LIMIT;

	const limit = Number(raw);
	if (!Number.isInteger(limit) || limit < 1)
		throw new BadRequestError('limit must be a positive integer');

	return Math.min(limit, MAX_LIMIT);
}

/** Comma-separated lists, matching how the console serialises them. */
function parseFilter(query: LogsQuery): OperatorLogFilter {
	return sanitizeFilter({
		minLevel: query.minLevel as OperatorLogLevel | undefined,
		scopes: split(query.scopes) as LogScope[] | undefined,
		hostIds: split(query.hostIds),
		roles: split(query.roles) as OperatorLogRole[] | undefined,
		executionId: query.executionId,
		grep: query.grep,
	});
}

/**
 * Drops anything unrecognised rather than rejecting the request. A stale filter
 * — a scope renamed between releases, a host that has since gone away — should
 * widen the view, not fail the console with a 400 the user cannot act on.
 */
function sanitizeFilter(filter: OperatorLogFilter): OperatorLogFilter {
	const clean: OperatorLogFilter = {};

	if (filter.minLevel && LEVELS.has(filter.minLevel)) clean.minLevel = filter.minLevel;

	const scopes = filter.scopes?.filter((scope) => SCOPES.has(scope));
	if (scopes?.length) clean.scopes = scopes;

	const roles = filter.roles?.filter((role) => ROLES.has(role));
	if (roles?.length) clean.roles = roles;

	if (filter.hostIds?.length) clean.hostIds = filter.hostIds.filter((id) => typeof id === 'string');
	if (typeof filter.executionId === 'string' && filter.executionId) {
		clean.executionId = filter.executionId;
	}
	if (typeof filter.grep === 'string' && filter.grep) clean.grep = filter.grep;

	return clean;
}

function split(raw: string | undefined): string[] | undefined {
	if (!raw) return undefined;

	const parts = raw
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);

	return parts.length > 0 ? parts : undefined;
}
