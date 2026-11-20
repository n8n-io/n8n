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
/** A rate-limited call is tried again after these pauses, so a burst of questions does not lose a source. */
const RATE_LIMIT_RETRY_PAUSES_MS = [5_000, 15_000];
const RATE_LIMIT_PATTERN = /rate.?limit|too many requests|\b429\b/i;

/**
 * Runs one node operation for a live source over `EphemeralNodeExecutor.executeInline`.
 * The credential travels as `{ id, type }`; the node decrypts and refreshes it.
 * Every failure becomes a `LiveSourceUnavailableError` with a sanitised message.
 */
@Service()
export class NodeOperationAdapter {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly executor: EphemeralNodeExecutor,
		private readonly nodeTypes: NodeTypes,
	) {
		this.logger = logger.scoped('knowledge');
	}

	async execute(ctx: LiveRunContext, operation: NodeOperation): Promise<IDataObject[]> {
		for (const [attempt, pause] of [...RATE_LIMIT_RETRY_PAUSES_MS, undefined].entries()) {
			try {
				return await this.executeOnce(ctx, operation);
			} catch (error) {
				const rateLimited =
					error instanceof LiveSourceUnavailableError && RATE_LIMIT_PATTERN.test(error.message);
				if (!rateLimited || pause === undefined) throw error;
				this.logger.debug('Live source operation was rate limited, trying again', {
					sourceId: ctx.sourceId,
					attempt: attempt + 1,
					pauseMs: pause,
				});
				await sleep(pause, ctx.signal);
			}
		}
		throw new LiveSourceUnavailableError(ctx.sourceId, 'the operation was rate limited');
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
