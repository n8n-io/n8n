import type { IntentoConnectionType } from 'n8n-workflow';

import { ContextFactory, ExecutionContext } from 'context/*';
import { SupplyError } from 'supply/supply-error';
import type { SupplyRequest } from 'supply/supply-request';
import { SupplyResponse } from 'supply/supply-response';
import { Tracer } from 'tracing/*';
import type { IDescriptor, IFunctions, ITraceable, IValidatable } from 'types/*';

export abstract class SupplierBase<TI extends SupplyRequest, TS extends SupplyResponse> {
	protected readonly connection: IntentoConnectionType;
	protected readonly functions: IFunctions;
	protected readonly tracer: Tracer;
	readonly descriptor: IDescriptor;

	constructor(descriptor: IDescriptor, connection: IntentoConnectionType, functions: IFunctions) {
		this.connection = connection;
		this.functions = functions;
		this.tracer = new Tracer(functions);
		this.descriptor = descriptor;
	}

	async supplyWithRetries(request: TI, signal?: AbortSignal): Promise<TS | SupplyError> {
		const context = ContextFactory.read<ExecutionContext>(ExecutionContext, this.functions, this.tracer);
		const cancellationSignal = context.createAbortSignal(signal);

		let result: TS | SupplyError | undefined;
		for (let attempt = 0; attempt < context.maxAttempts; attempt++) {
			result = await this.supply(request, cancellationSignal);
			if (result instanceof SupplyResponse) return result;
			if (!result.isRetriable) return result;
		}
		if (result) return result;
		this.tracer.bugDetected(this.descriptor.name, 'No supply attempts were made.', request.asLogMetadata());
	}

	async supply(request: TI, signal?: AbortSignal, attempt: number = 0): Promise<TS | SupplyError> {
		this.validate(request);

		let result: TS | SupplyError;
		const runIndex = this.startSupply(request, attempt);
		try {
			signal?.throwIfAborted();
			result = await this.execute(request, signal);
			this.completeSupply(runIndex, result, attempt);
		} catch (error) {
			result = this.onError(request, error as Error);
			this.completeSupply(runIndex, result, attempt);
		}

		this.validate(result);
		return result;
	}

	protected abstract execute(request: TI, signal?: AbortSignal): Promise<TS | SupplyError>;

	protected onError(request: TI, error: Error): SupplyError {
		if (error instanceof DOMException && error.name === 'TimeoutError') {
			const reason = `⏰ [Timeout] Supplier '${this.descriptor.name}' reached the execution timed out. Please consider increasing the node timeout limit.`;
			const result = new SupplyError(request, 408, reason, false);
			this.tracer.warn(reason, result.asLogMetadata());
			return result;
		}
		if (error instanceof DOMException && error.name === 'AbortError') {
			const reason = `⏰ [Abort] Supplier '${this.descriptor.name}' was not able to complete the execution before the abort.`;
			const result = new SupplyError(request, 408, reason, false);
			this.tracer.warn(reason, result.asLogMetadata());
			return result;
		}
		const reason = `🐞 [Bug] Supplier '${this.descriptor.name}' encountered an unexpected error: ${error.message}`;
		const result = new SupplyError(request, 500, reason, false);
		const meta = { result: result.asLogMetadata(), source: error };
		this.tracer.error(reason, meta);
		return result;
	}

	private startSupply(request: TI, attempt: number): number {
		this.tracer.debug(`🚚 [${this.descriptor.name}] Starting supply attempt ${attempt}...`, request.asLogMetadata());
		const runIndex = this.functions.addInputData(this.connection, [[{ json: request.asDataObject() }]]);
		return runIndex.index;
	}

	private completeSupply(index: number, result: TS | SupplyError, attempt: number): void {
		if (result instanceof SupplyResponse) {
			this.tracer.debug(`🚚 [${this.descriptor.name}] supplied data successfully on attempt ${attempt}`, result.asLogMetadata());
			this.functions.addOutputData(this.connection, index, [[{ json: result.asDataObject() }]]);
			return;
		}
		if (result.isRetriable) {
			this.tracer.info(`🚚 [${this.descriptor.name}] failed supply on attempt ${attempt}`, result.asLogMetadata());
		} else {
			this.tracer.warn(`🚚 [${this.descriptor.name}] failed supply with non-retriable error on attempt ${attempt}`, result.asLogMetadata());
		}
		this.functions.addOutputData(this.connection, index, result.asError(this.functions.getNode()));
	}

	private validate(item: IValidatable & ITraceable): void {
		try {
			item.throwIfInvalid();
		} catch (error) {
			this.tracer.bugDetected(item.constructor.name, error as Error, item.asLogMetadata());
		}
	}
}
