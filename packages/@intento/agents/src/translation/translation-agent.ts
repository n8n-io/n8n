import { AgentError, SupplyError, AgentBase } from 'intento-core';
import type { ISegment, SegmentsSupplierBase } from 'intento-segmentation';
import { SplitResponse, SplitRequest, MergeResponse, MergeRequest } from 'intento-segmentation';
import type { ITranslation, TranslationSupplierBase } from 'intento-translation';
import { TranslationResponse, TranslationRequest } from 'intento-translation';
import type { IntentoConnectionType, IExecuteFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { TranslationAgentDescriptor } from 'translation/translation-agent-descriptor';

import type { TranslationAgentRequest } from './translation-agent-request';
import { TranslationAgentResponse } from './translation-agent-response';

export class TranslationAgent extends AgentBase<TranslationAgentRequest, TranslationAgentResponse> {
	private segmentation?: SegmentsSupplierBase;
	private translation?: TranslationSupplierBase[];

	constructor(functions: IExecuteFunctions) {
		super(TranslationAgentDescriptor, functions);
	}

	protected async initialize(signal: AbortSignal): Promise<void> {
		signal.throwIfAborted();

		// Initialize segmentation supplier
		let connection: IntentoConnectionType = NodeConnectionTypes.IntentoSegmentSupplier;
		const segmentationSuppliers = await this.getSuppliers<SegmentsSupplierBase>(connection, signal);
		if (segmentationSuppliers.length === 0) throw new Error(`No suppliers configured for ${connection}.`);
		if (segmentationSuppliers.length > 1) throw new Error(`Multiple suppliers configured for ${connection}. Only one is supported.`);
		this.segmentation = segmentationSuppliers[0];

		// Initialize translation suppliers
		connection = NodeConnectionTypes.IntentoTranslationSupplier;
		const translationSuppliers = await this.getSuppliers<TranslationSupplierBase>(connection, signal);
		if (translationSuppliers.length === 0) throw new Error(`No suppliers configured for ${connection}.`);
		this.translation = translationSuppliers;
	}

	protected async execute(request: TranslationAgentRequest, signal: AbortSignal): Promise<TranslationAgentResponse | AgentError> {
		signal.throwIfAborted();

		// Step 1: Split text into segments
		const splitResult = await this.splitText(request, signal);
		if (splitResult instanceof SupplyError) return new AgentError(request, splitResult.code, splitResult.reason);
		const segments = splitResult.segments;

		// Step 2: Create translation requests
		const requests = this.createTranslationRequests(request, segments, signal);

		// Step 3: Translate each request and collect results
		const promises = requests.map(async (request) => await this.translate(request, signal));
		const results = await Promise.all(promises);

		// Step 4: verify results
		const error = results.find((res) => res instanceof SupplyError);
		if (error) return new AgentError(request, error.code, error.reason);

		// Step 5: Merge translated segments
		const translation = results.map((res) => (res as TranslationResponse).translations).flat();
		const mergeResult = await this.mergeTranslations(request, translation, signal);
		if (mergeResult instanceof SupplyError) return new AgentError(request, mergeResult.code, mergeResult.reason);

		const detectedLanguages = this.mergeDetectedLanguages(translation);
		return new TranslationAgentResponse(request, mergeResult.text, detectedLanguages);
	}

	private createTranslationRequests(request: TranslationAgentRequest, segments: ISegment[], signal: AbortSignal): TranslationRequest[] {
		signal.throwIfAborted();
		const limits = this.translation!.map((supplier) => supplier.descriptor.batchLimit);
		const limit = Math.min(...limits);
		const requests: TranslationRequest[] = [];
		for (let i = 0; i < segments.length; i += limit) {
			const batch = segments.slice(i, i + limit);
			requests.push(new TranslationRequest(request, batch, request.to, request.from));
		}
		return requests;
	}

	private async translate(request: TranslationRequest, signal: AbortSignal): Promise<TranslationResponse | SupplyError> {
		for (let i = 0; i < this.translation!.length; i++) {
			signal.throwIfAborted();
			const supplier = this.translation![i];
			const result = await supplier.supplyWithRetries(request, signal);
			if (result instanceof TranslationResponse) return result;
			if (i >= this.translation!.length - 1) return result;
		}
		throw new Error('No translation suppliers were found.');
	}

	private async mergeTranslations(
		request: TranslationAgentRequest,
		segments: ISegment[],
		signal: AbortSignal,
	): Promise<MergeResponse | SupplyError> {
		signal.throwIfAborted();

		const mergeRequest = new MergeRequest(request, segments);
		const mergeResponse = await this.segmentation!.supply(mergeRequest, signal);

		if (mergeResponse instanceof MergeResponse || mergeResponse instanceof SupplyError) return mergeResponse;
		throw new Error('Segmentation supplier returned SplitResponse instead of MergeResponse.');
	}

	private async splitText(request: TranslationAgentRequest, signal: AbortSignal): Promise<SplitResponse | SupplyError> {
		signal.throwIfAborted();
		const limits = this.translation!.map((supplier) => supplier.descriptor.segmentLimit);
		const limit = Math.min(...limits);

		const splitRequest = new SplitRequest(request, request.text, limit, request.from);
		const splitResponse = await this.segmentation!.supply(splitRequest, signal);

		if (splitResponse instanceof SupplyError || splitResponse instanceof SplitResponse) return splitResponse;
		throw new Error('Segmentation supplier returned MergeResponse instead of SplitResponse.');
	}

	private mergeDetectedLanguages(translations: ITranslation[]): string[] {
		const detectedLanguages = new Map<number, string>();

		const sorted = [...translations].sort((a, b) => {
			if (a.textPosition !== b.textPosition) return a.textPosition - b.textPosition;
			return a.segmentPosition - b.segmentPosition;
		});

		for (const translation of sorted) {
			detectedLanguages.set(translation.textPosition, translation.detectedLanguage);
		}
		return Array.from(detectedLanguages.values());
	}
}
