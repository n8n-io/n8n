import type { IFunctions, SupplyResponse } from 'intento-core';
import { SupplyError, AgentBase, ContextFactory, SupplyFactory } from 'intento-core';
import { NodeConnectionTypes } from 'n8n-workflow';

import { TranslationContext } from 'context/*';
import {
	SplitRequest,
	SplitResponse,
	TranslationRequest,
	TranslationResponse,
	type SegmentsSupplierBase,
	type TranslationSupplierBase,
} from 'supply/*';
import { MergeRequest } from 'supply/merge-request';
import { MergeResponse } from 'supply/merge-response';
import type { ISegment } from 'types/i-segment';

export class TranslationAgent extends AgentBase {
	private context?: TranslationContext;
	private translation?: TranslationSupplierBase[];
	private segmentation?: SegmentsSupplierBase;

	//#region Initialization
	protected async initialize(signal: AbortSignal): Promise<void> {
		signal.throwIfAborted();
		this.context = ContextFactory.read<TranslationContext>(TranslationContext, this.functions, this.tracer);
		await this.initSegmentation(signal);
		await this.initTranslation(signal);
	}

	private async initSegmentation(signal: AbortSignal): Promise<void> {
		signal.throwIfAborted();
		const connection = NodeConnectionTypes.IntentoSegmentSupplier;
		const suppliers = await SupplyFactory.getSuppliers<SegmentsSupplierBase>(this.functions, connection, this.tracer);
		this.segmentation = suppliers[0];
	}

	private async initTranslation(signal: AbortSignal): Promise<void> {
		signal.throwIfAborted();
		const connection = NodeConnectionTypes.IntentoTranslationSupplier;
		const suppliers = await SupplyFactory.getSuppliers<TranslationSupplierBase>(this.functions, connection, this.tracer);
		this.translation = suppliers;
	}
	//#endregion

	protected async execute(signal: AbortSignal): Promise<SupplyResponse | SupplyError> {
		signal.throwIfAborted();
		if (!this.context) throw new Error('Translation context is not initialized.');
		if (!this.segmentation) throw new Error('Segmentation supplier is not initialized.');
		if (!this.translation || this.translation.length === 0) throw new Error('No translation suppliers are initialized.');

		// Step 1: Split text into segments
		const splitResult = await this.splitText(signal);
		if (splitResult instanceof SupplyError) return splitResult;
		const segments = splitResult.segments;

		// Step 2: Create translation requests
		const requests = this.createRequests(segments, signal);

		// Step 3: Translate each request and collect results
		const promises = requests.map(async (request) => await this.translate(request, signal));
		const results = await Promise.all(promises);

		// Step 4: verify results
		const error = results.find((res) => res instanceof SupplyError);
		if (error) return error;

		// Step 5: Merge translated segments
		const translation = results.map((res) => (res as TranslationResponse).segments).flat();
		const mergeResult = await this.mergeTranslations(translation, signal);
		return mergeResult;
	}

	private async splitText(signal: AbortSignal): Promise<SplitResponse | SupplyError> {
		const limit = this.translation?.map((supplier) => supplier.descriptor.segmentLimit).reduce((a, b) => Math.min(a!, b!));
		const request = new SplitRequest(this.context!.text, limit!, this.context!.from);
		const result = await this.segmentation!.supply(request, signal);
		if (result instanceof SupplyError || result instanceof SplitResponse) return result;
		throw new Error('Segmentation supplier returned MergeResponse instead of SplitResponse.');
	}

	private createRequests(segments: ISegment[], signal: AbortSignal): TranslationRequest[] {
		signal.throwIfAborted();
		const limit = this.translation?.map((supplier) => supplier.descriptor.batchLimit).reduce((a, b) => Math.min(a!, b!));
		const requests: TranslationRequest[] = [];
		for (let i = 0; i < segments.length; i += limit!) {
			const batch = segments.slice(i, i + limit!);
			requests.push(new TranslationRequest(batch, this.context!.to, this.context!.from));
		}
		return requests;
	}

	private async translate(request: TranslationRequest, signal: AbortSignal): Promise<TranslationResponse | SupplyError> {
		for (let i = 0; i < this.translation!.length; i++) {
			signal.throwIfAborted();
			const supplier = this.translation![i];
			const result = await supplier.supply(request, signal);
			if (result instanceof TranslationResponse) return result;
			if (i >= this.translation!.length - 1) return result;
		}
		throw new Error('No translation suppliers were found.');
	}

	private async mergeTranslations(segments: ISegment[], signal: AbortSignal): Promise<MergeResponse | SupplyError> {
		signal.throwIfAborted();
		const request = new MergeRequest(segments);
		const response = await this.segmentation!.supply(request, signal);
		if (response instanceof MergeResponse || response instanceof SupplyError) return response;
		throw new Error('Segmentation supplier returned SplitResponse instead of MergeResponse.');
	}

	static async initializeAgent(functions: IFunctions, signal: AbortSignal): Promise<TranslationAgent> {
		const agent = new TranslationAgent(functions);
		await agent.initialize(signal);
		return agent;
	}
}
