import type { IntentoConnectionType } from 'n8n-workflow';

import { ContextFactory, ExecutionContext } from 'context/*';
import type { SupplyErrorBase } from 'supply/supply-error-base';
import type { SupplyRequestBase } from 'supply/supply-request-base';
import { SupplyResponseBase } from 'supply/supply-response-base';
import type { IDescriptor, IFunctions } from 'types/*';

import { SupplierBase } from './supplier-base';

export abstract class RetriableSupplierBase<
	TI extends SupplyRequestBase,
	TS extends SupplyResponseBase,
	TE extends SupplyErrorBase,
> extends SupplierBase<TI, TS, TE> {
	protected readonly context: ExecutionContext;

	constructor(descriptor: IDescriptor, connection: IntentoConnectionType, functions: IFunctions) {
		super(descriptor, connection, functions);
		this.context = ContextFactory.read(ExecutionContext, functions, this.tracer);
	}

	async supplyWithRetries(request: TI, signal?: AbortSignal): Promise<TS | TE> {
		this.tracer.debug(`🚚 [${this.descriptor.name}] Supplying data ...`, request.asLogMetadata());

		const cancellationSignal = this.context.createAbortSignal(signal);
		let result: TS | TE | undefined;

		for (let attempt = 0; attempt < this.context.maxAttempts; attempt++) {
			result = await this.supply(request, cancellationSignal);
			if (result instanceof SupplyResponseBase) return result;
			if (!result.isRetriable) return result;
		}
		if (result) return result;
		this.tracer.bugDetected(RetriableSupplierBase.name, 'No supply attempts were made.', request.asLogMetadata());
	}
}
