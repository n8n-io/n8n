import { throwIfAborted } from '@n8n/agents';
import { detectAuthenticationParameterValue } from '@n8n/ai-utilities/node-catalog';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';
import type { IDataObject, INodeParameters } from 'n8n-workflow';

import { EphemeralNodeExecutor } from '@/node-execution/ephemeral-node-executor';
import { NodeTypes } from '@/node-types';

import { LiveSourceUnavailableError } from './live-source.errors';
import type { LiveRunContext } from './live-source-provider';

function isRateLimited(error: unknown): boolean {
	return error instanceof LiveSourceUnavailableError && RATE_LIMIT_PATTERN.test(error.message);
}

/** One node operation to run, as a provider describes it. */
export interface NodeOperation {
	nodeType: string;
	nodeTypeVersion: number;
	/** The parameters as a workflow stores them. `authentication` is set by the adapter. */
	parameters: INodeParameters;
	/** Input items. Default: one empty item, so the node runs once. */
	input?: IDataObject[];
}

const EPHEMERAL_NODE_NAME = 'Knowledge live source';
/** A rate-limited call is tried once more after this pause: a burst, not a throttled source. */
const RATE_LIMIT_RETRY_PAUSE_MS = 3_000;
/** A source that is still rate limited after the retry answers "unavailable" at once for this long. */
const RATE_LIMIT_BREAKER_MS = 60_000;
const RATE_LIMIT_PATTERN = /rate.?limit|too many requests|\b429\b/i;

/**
 * Runs one node operation for a live source over `EphemeralNodeExecutor.executeInline`.
 * The credential travels as `{ id, type }`; the node decrypts and refreshes it.
 * Every failure becomes a `LiveSourceUnavailableError` with a sanitised message.
 */
@Service()
export class NodeOperationAdapter {
	private readonly logger: Logger;

	/** When a throttled credential and node may be called again, by `credentialId:nodeType`. */
	private readonly rateLimitedUntil = new Map<string, number>();

	constructor(
		logger: Logger,
		private readonly executor: EphemeralNodeExecutor,
		private readonly nodeTypes: NodeTypes,
	) {
		this.logger = logger.scoped('knowledge');
	}

	/**
	 * Runs the operation. A rate-limited call gets one more try after a short
	 * pause; a source that is still throttled then answers "unavailable" at
	 * once for a minute, so one throttled source does not slow every question
	 * and the retries do not keep the throttle up.
	 */
	async execute(ctx: LiveRunContext, operation: NodeOperation): Promise<IDataObject[]> {
		const breakerKey = `${ctx.credential.id}:${operation.nodeType}`;
		const openUntil = this.rateLimitedUntil.get(breakerKey);
		if (openUntil !== undefined && openUntil > Date.now()) {
			const seconds = Math.ceil((openUntil - Date.now()) / 1000);
			throw new LiveSourceUnavailableError(
				ctx.sourceId,
				`the source is rate limited; try again in ${seconds} s`,
			);
		}
		this.rateLimitedUntil.delete(breakerKey);
		try {
			return await this.executeOnce(ctx, operation);
		} catch (error) {
			if (!isRateLimited(error)) throw error;
		}
		this.logger.debug('Live source operation was rate limited, trying once more', {
			sourceId: ctx.sourceId,
			pauseMs: RATE_LIMIT_RETRY_PAUSE_MS,
		});
		await sleep(RATE_LIMIT_RETRY_PAUSE_MS, ctx.signal);
		try {
			return await this.executeOnce(ctx, operation);
		} catch (error) {
			if (isRateLimited(error)) {
				this.rateLimitedUntil.set(breakerKey, Date.now() + RATE_LIMIT_BREAKER_MS);
				this.logger.info('Live source is rate limited, pausing its calls', {
					sourceId: ctx.sourceId,
					nodeType: operation.nodeType,
					pauseMs: RATE_LIMIT_BREAKER_MS,
				});
			}
			throw error;
		}
	}

	private async executeOnce(ctx: LiveRunContext, operation: NodeOperation): Promise<IDataObject[]> {
		const { sourceId } = ctx;
		throwIfAborted(ctx.signal);
		const nodeType = this.nodeTypes.getByNameAndVersion(
			operation.nodeType,
			operation.nodeTypeVersion,
		);
		const authentication = detectAuthenticationParameterValue(
			nodeType.description,
			ctx.credential.type,
		);
		const nodeParameters: INodeParameters =
			authentication === undefined
				? operation.parameters
				: { ...operation.parameters, authentication };

		const startedAt = Date.now();
		const result = await this.executor.executeInline({
			nodeType: operation.nodeType,
			nodeTypeVersion: operation.nodeTypeVersion,
			nodeParameters,
			// `executeInline` checks that the project can use the credential and fills the name.
			credentialDetails: { [ctx.credential.type]: { id: ctx.credential.id, name: '' } },
			inputData: (operation.input ?? [{}]).map((json) => ({ json })),
			projectId: ctx.projectId,
			nodeName: EPHEMERAL_NODE_NAME,
		});
		const durationMs = Date.now() - startedAt;

		if (result.status === 'error') {
			this.logger.debug('Live source operation failed', {
				sourceId,
				nodeType: operation.nodeType,
				resource: operation.parameters.resource,
				operation: operation.parameters.operation,
				durationMs,
				violations: result.violations?.length ?? 0,
			});
			const detail = result.violations?.length
				? 'a policy refused the operation'
				: (result.error ?? 'the operation failed');
			throw new LiveSourceUnavailableError(sourceId, detail);
		}

		this.logger.debug('Live source operation ran', {
			sourceId,
			nodeType: operation.nodeType,
			resource: operation.parameters.resource,
			operation: operation.parameters.operation,
			items: result.data.length,
			durationMs,
		});
		return result.data.map((item) => item.json);
	}
}
