import type { SupplyError, IFunctions } from 'intento-core';
import { ContextFactory, Delay } from 'intento-core';
import { SplitContext } from 'intento-segmentation';
import type { IntentoConnectionType } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { DelayContext } from 'context/*';
import { DryRunContext } from 'suppliers/dry-run/dry-run-context';
import { DryRunDescriptor } from 'suppliers/dry-run/dry-run-descriptor';
import type { TranslationRequest } from 'supply/*';
import { TranslationResponse, TranslationSupplierBase } from 'supply/*';
import type { ITranslation } from 'types/*';

export class DryRunSupplier extends TranslationSupplierBase {
	private readonly delayContext: DelayContext;
	private readonly dryRunContext: DryRunContext;
	private readonly splitContext: SplitContext;

	constructor(connection: IntentoConnectionType, functions: IFunctions) {
		super(DryRunDescriptor, connection, functions);

		this.delayContext = ContextFactory.read<DelayContext>(DelayContext, this.functions, this.tracer);
		this.dryRunContext = ContextFactory.read<DryRunContext>(DryRunContext, this.functions, this.tracer);
		this.splitContext = ContextFactory.read<SplitContext>(SplitContext, this.functions, this.tracer);
		this.descriptor.batchLimit = this.splitContext.batchSize;
		this.descriptor.segmentLimit = this.splitContext.segmentSize;

		Object.freeze(this);
	}

	protected async translate(request: TranslationRequest, signal?: AbortSignal): Promise<TranslationResponse | SupplyError> {
		signal?.throwIfAborted();

		const delayMs = this.delayContext.calculateDelay();
		await Delay.apply(delayMs, signal);

		switch (this.dryRunContext.mode) {
			case 'pass':
				return this.passTranslation(request);
			case 'replace':
				return this.replaceTranslation(request);
			case 'override':
				return this.overrideTranslation(request);
			case 'fail':
				return this.failTranslation();
		}
	}

	private passTranslation(request: TranslationRequest): TranslationResponse {
		this.tracer.debug(`${this.descriptor.symbol} Passing through original text without translation.`, request.asLogMetadata());
		const translations: ITranslation[] = request.segments.map((segment) => ({
			segmentPosition: segment.segmentPosition,
			textPosition: segment.textPosition,
			text: segment.text,
			detectedLanguage: request.from,
		}));
		const response = new TranslationResponse(request, translations);
		this.tracer.info(
			`${this.descriptor.symbol} Passed through ${translations.length} segment(s) without translation.`,
			response.asLogMetadata(),
		);
		return response;
	}

	private replaceTranslation(request: TranslationRequest): TranslationResponse {
		const replaceBy = this.dryRunContext.replacePattern!;
		const replaceTo = this.dryRunContext.replaceTo!;
		this.tracer.debug(`${this.descriptor.symbol} Replacing text using pattern ${replaceBy} to ${replaceTo}.`, request.asLogMetadata());

		const match = replaceBy.match(/^\/(.+)\/([gimusy]*)$/);
		const pattern = new RegExp(match![1], match![2]);

		const translations: ITranslation[] = request.segments.map((segment) => {
			const text = segment.text.replace(pattern, replaceTo);
			return {
				segmentPosition: segment.segmentPosition,
				textPosition: segment.textPosition,
				text,
				detectedLanguage: request.from,
			};
		});

		const response = new TranslationResponse(request, translations);
		this.tracer.info(`${this.descriptor.symbol} Replaced text in ${translations.length} segment(s).`, response.asLogMetadata());
		return response;
	}

	private overrideTranslation(request: TranslationRequest): TranslationResponse {
		this.tracer.debug(`${this.descriptor.symbol} Overriding translation with predefined text.`, request.asLogMetadata());
		const override = this.dryRunContext.override!;

		const translations: ITranslation[] = request.segments.map((segment) => ({
			segmentPosition: segment.segmentPosition,
			textPosition: segment.textPosition,
			text: override,
			detectedLanguage: request.from,
		}));

		const response = new TranslationResponse(request, translations);
		this.tracer.info(
			`${this.descriptor.symbol} Translation has been overridden in ${translations.length} segment(s).`,
			response.asLogMetadata(),
		);
		return response;
	}

	private failTranslation(): never {
		this.tracer.debug(`${this.descriptor.symbol} Failing translation with predefined error...`);
		const error = new NodeApiError(this.functions.getNode(), {
			httpCode: this.dryRunContext.errorCode!,
			message: `${this.descriptor.symbol} Simulated translation failure: ${this.dryRunContext.errorMessage}`,
		});
		this.tracer.info(`${this.descriptor.symbol} Translation has been failed as expected with simulated error.`, { error });
		throw error;
	}
}
