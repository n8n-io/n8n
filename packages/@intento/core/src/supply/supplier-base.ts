import type { IntentoConnectionType } from 'n8n-workflow';

import type { SupplyErrorBase } from 'supply/supply-error-base';
import type { SupplyRequestBase } from 'supply/supply-request-base';
import { SupplyResponseBase } from 'supply/supply-response-base';
import { Tracer } from 'tracing/*';
import type { IDescriptor, IFunctions } from 'types/*';

export abstract class SupplierBase<TI extends SupplyRequestBase, TS extends SupplyResponseBase, TE extends SupplyErrorBase> {
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

	protected abstract execute(request: TI, signal?: AbortSignal): Promise<TS | TE>;

	protected abstract onError(request: TI, error: Error): TE;

	async supply(request: TI, signal?: AbortSignal): Promise<TS | TE> {
		const runIndex = this.startSupply(request);
		try {
			const result = await this.execute(request, signal);
			this.completeSupply(runIndex, result);
			return result;
		} catch (error) {
			const supplyError = this.onError(request, error as Error);
			this.completeSupply(runIndex, supplyError);
			return supplyError;
		}
	}

	private startSupply(request: TI): number {
		this.tracer.debug(`🚚 [${this.descriptor.name}] Starting supply...`, request.asLogMetadata());
		const runIndex = this.functions.addInputData(this.connection, [[{ json: request.asDataObject() }]]);
		return runIndex.index;
	}

	private completeSupply(index: number, result: TS | TE): void {
		if (result instanceof SupplyResponseBase) {
			this.tracer.debug(`🚚 [${this.descriptor.name}] supplied data successfully`, result.asLogMetadata());
			this.functions.addOutputData(this.connection, index, [[{ json: result.asDataObject() }]]);
			return;
		}
		if (result.isRetriable) {
			this.tracer.info(`🚚 [${this.descriptor.name}] failed supply`, result.asLogMetadata());
		} else {
			this.tracer.warn(`🚚 [${this.descriptor.name}] failed supply with non-retriable error`, result.asLogMetadata());
		}
		this.functions.addOutputData(this.connection, index, result.asError(this.functions.getNode()));
	}
}
