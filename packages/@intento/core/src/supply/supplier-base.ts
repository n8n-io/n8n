import type { IntentoConnectionType } from 'n8n-workflow';

import { ContextFactory, ExecutionContext } from 'context/*';
import type { SupplyErrorBase } from 'supply/supply-error-base';
import type { SupplyRequestBase } from 'supply/supply-request-base';
import { SupplyResponseBase } from 'supply/supply-response-base';
import { Tracer } from 'tracing/*';
import type { IDescriptor, IFunctions } from 'types/*';
import { Delay } from 'utils/*';

export abstract class SupplierBase<TI extends SupplyRequestBase, TS extends SupplyResponseBase, TE extends SupplyErrorBase> {
	protected readonly connection: IntentoConnectionType;
	protected readonly functions: IFunctions;
	protected readonly tracer: Tracer;
	protected readonly context: ExecutionContext;
	readonly descriptor: IDescriptor;

	constructor(descriptor: IDescriptor, connection: IntentoConnectionType, functions: IFunctions) {
		this.connection = connection;
		this.functions = functions;
		this.tracer = new Tracer(functions);
		this.context = ContextFactory.read(ExecutionContext, functions, this.tracer);
		this.descriptor = descriptor;
	}

	async supplyWithRetries(request: TI, signal?: AbortSignal): Promise<TS | TE> {
		this.tracer.debug(`🚚 [${this.descriptor.name}] Supplying data ...`, request.asLogMetadata());

		const cancellationSignal = this.context.createAbortSignal(signal);
		let result: TS | TE | undefined;

		for (let attempt = 0; attempt < this.context.maxAttempts; attempt++) {
			result = await this.executeAttempt(attempt, request, cancellationSignal);
			if (result instanceof SupplyResponseBase) return result;
			if (!result.isRetriable) return result;
		}
		if (result) return result;
		this.tracer.bugDetected(SupplierBase.name, 'No supply attempts were made.', request.asLogMetadata());
	}

	protected abstract supply(request: TI, signal?: AbortSignal): Promise<TS | TE>;

	protected abstract onError(request: TI, error: Error): TE;

	private async executeAttempt(attempt: number, request: TI, signal?: AbortSignal): Promise<TS | TE> {
		const runIndex = this.startAttempt(request, attempt);
		try {
			const delay = this.context.calculateDelay(attempt);
			await Delay.apply(delay, signal);
			const result = await this.supply(request.clone(), signal);
			this.completeAttempt(runIndex, result, attempt);
			return result;
		} catch (error) {
			const supplyError = this.onError(request, error as Error);
			this.completeAttempt(runIndex, supplyError, attempt);
			return supplyError;
		}
	}

	private startAttempt(request: TI, attempt: number): number {
		this.tracer.debug(`🚚 [${this.descriptor.name}] Starting supply attempt ${attempt + 1}...`, request.asLogMetadata());
		const runIndex = this.functions.addInputData(this.connection, [[{ json: request.asDataObject() }]]);
		return runIndex.index;
	}

	private completeAttempt(index: number, result: TS | TE, attempt: number): void {
		if (result instanceof SupplyResponseBase) {
			this.tracer.debug(`🚚 [${this.descriptor.name}] supplied data successfully on attempt ${attempt + 1}`, result.asLogMetadata());
			this.functions.addOutputData(this.connection, index, [[{ json: result.asDataObject() }]]);
			return;
		}
		if (result.isRetriable) {
			this.tracer.info(`🚚 [${this.descriptor.name}] failed supply on attempt ${attempt + 1}`, result.asLogMetadata());
		} else {
			this.tracer.warn(
				`🚚 [${this.descriptor.name}] failed supply on attempt ${attempt + 1} with non-retriable error`,
				result.asLogMetadata(),
			);
		}
		this.functions.addOutputData(this.connection, index, result.asError(this.functions.getNode()));
	}
}
