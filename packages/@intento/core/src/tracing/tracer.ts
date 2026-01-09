import type { INode, Logger, LogMetadata } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { IFunctions } from 'types/*';
import { Pipeline } from 'utils/*';

export class Tracer {
	private readonly node: INode;
	readonly log: Logger;
	readonly traceId: string;
	readonly workflowId: string;
	readonly executionId: string;

	constructor(functions: IFunctions) {
		this.log = functions.logger;
		this.node = functions.getNode();
		this.workflowId = functions.getWorkflow().id!;
		this.executionId = functions.getExecutionId();
		this.traceId = Tracer.getTraceId(functions, this.log);
		Object.freeze(this);
	}

	debug(message: string, extension?: LogMetadata): void {
		this.log.debug(message, this.getLogMetadata(extension));
	}

	info(message: string, extension?: LogMetadata): void {
		this.log.info(message, this.getLogMetadata(extension));
	}

	warn(message: string, extension?: LogMetadata): void {
		this.log.warn(message, this.getLogMetadata(extension));
	}

	error(message: string, extension?: LogMetadata): void {
		this.log.error(message, this.getLogMetadata(extension));
	}

	bugDetected(where: string, error: Error | string, extension?: LogMetadata): never {
		const message = `🐞 [BUG] at '${where}'. Node ${this.node.name} thrown error: ${typeof error === 'string' ? error : error.message}`;
		const meta = {
			where,
			...(typeof error === 'string' ? { message: error } : { error }),
			...(extension ?? {}),
		};
		this.log.error(message, meta);
		throw new NodeOperationError(this.node, message);
	}

	private getLogMetadata(extension?: LogMetadata): LogMetadata {
		return {
			traceId: this.traceId,
			nodeName: this.node.name,
			workflowId: this.workflowId,
			executionId: this.executionId,
			...(extension ?? {}),
		};
	}

	private static getTraceId(functions: IFunctions, log: Logger): string {
		const logMeta = {
			nodeName: functions.getNode().name,
			workflowId: functions.getWorkflow().id!,
			executionId: functions.getExecutionId(),
		};
		log.debug('🧭 [Tracer] Getting traceId ...', logMeta);

		log.debug('🧭 [Tracer] Checking custom data for traceId ...', logMeta);
		let traceId = this.getCustomData(functions);
		if (traceId) {
			log.debug(`🧭 [Tracer] Found traceId in custom data: ${traceId}`, logMeta);
			return traceId;
		}

		log.debug('🧭 [Tracer] Extracting traceIds from pipeline ...', logMeta);
		const uniqueIds: string[] = this.getFromPipeline(functions);

		switch (uniqueIds.length) {
			case 0: {
				traceId = crypto.randomUUID();
				log.debug(`🧭 [Tracer] No traceId found in pipeline. Generated new traceId: ${traceId}`, logMeta);
				break;
			}
			case 1:
				traceId = uniqueIds[0];
				log.debug(`🧭 [Tracer] Found single traceId in pipeline: ${traceId}`, logMeta);
				break;
			default: {
				traceId = uniqueIds[0];
				const meta = { traceIds: uniqueIds, ...logMeta };
				log.warn(`🧭 [Tracer] Multiple traceIds found in pipeline. Using the first one: ${traceId}`, meta);
				break;
			}
		}

		log.debug('🧭 [Tracer] Remembering traceId in custom data...', logMeta);
		this.rememberTraceId(functions, traceId);
		return traceId;
	}

	private static getFromPipeline(functions: IFunctions): string[] {
		const pipeline = Pipeline.readPipeline(functions);
		const traceIds: string[] = [];

		for (const [, values] of Object.entries(pipeline)) {
			for (const body of values as Array<Record<string, Record<string, unknown>>>) {
				if (body.json?.traceId && typeof body.json.traceId === 'string') {
					traceIds.push(body.json.traceId);
				}
			}
		}

		return Array.from(new Set(traceIds));
	}

	private static getCustomData(functions: IFunctions): string | undefined {
		const data = functions.getWorkflowDataProxy(0);
		const execution = data.$execution as Record<string, unknown>;
		const customData = execution.customData as Map<string, unknown> | undefined;

		if (!customData || typeof customData.get !== 'function') return undefined;

		const traceId = customData.get('traceId');
		return typeof traceId === 'string' ? traceId : undefined;
	}

	private static rememberTraceId(functions: IFunctions, traceId: string): void {
		const data = functions.getWorkflowDataProxy(0);
		const execution = data.$execution as Record<string, unknown>;
		const customData = execution.customData as Map<string, unknown> | undefined;

		if (!customData || typeof customData.set !== 'function') return;

		customData.set('traceId', traceId);
	}
}
