import type { IDescriptor, IFunctions, SupplyError } from 'intento-core';
import { SupplierBase } from 'intento-core';
import type { IntentoConnectionType } from 'n8n-workflow';

import { MergeRequest } from 'supply/merge-request';
import { MergeResponse } from 'supply/merge-response';
import { SplitRequest } from 'supply/split-request';
import type { SplitResponse } from 'supply/split-response';

/**
 * Abstract base for segmentation suppliers handling split and merge operations.
 *
 * Delegates to executeSplit() for splitting text into segments, and provides default
 * executeMerge() implementation that reassembles segments by position ordering.
 * Subclasses must implement executeSplit() for supplier-specific splitting logic.
 */
export abstract class SegmentsSupplierBase extends SupplierBase<SplitRequest | MergeRequest, SplitResponse | MergeResponse> {
	constructor(descriptor: IDescriptor, connection: IntentoConnectionType, functions: IFunctions) {
		super(descriptor, connection, functions);
	}

	protected async execute(request: SplitRequest | MergeRequest, signal: AbortSignal): Promise<SplitResponse | MergeResponse | SupplyError> {
		signal.throwIfAborted();
		if (request instanceof SplitRequest) return await this.executeSplit(request, signal);
		if (request instanceof MergeRequest) return await this.executeMerge(request, signal);
		// NOTE: bugDetected throws error - this line never returns
		this.tracer.bugDetected(this.constructor.name, `Unsupported request type: ${(request as object).constructor.name}`, { request });
	}

	/**
	 * Splits text into segments using supplier-specific logic.
	 *
	 * @param request - Split request with text items and segment limit
	 * @param signal - Abort signal for cancellation
	 * @returns Split response with segments or error if splitting fails
	 */
	protected abstract executeSplit(request: SplitRequest, signal: AbortSignal): Promise<SplitResponse | SupplyError>;

	/**
	 * Merges segments back into text items using default concatenation strategy.
	 *
	 * Sorts segments by textPosition then segmentPosition to preserve original order.
	 * Concatenates segments with same textPosition to reconstruct each text item.
	 * Override this method for custom merge logic (e.g., adding delimiters).
	 *
	 * @param request - Merge request with segments to reassemble
	 * @param signal - Abort signal for cancellation
	 * @returns Merge response with reassembled text items
	 */
	protected async executeMerge(request: MergeRequest, signal: AbortSignal): Promise<MergeResponse | SupplyError> {
		signal.throwIfAborted();

		this.tracer.debug(`Merging ${request.segments.length} segment(s)...`, request.asLogMetadata());

		// NOTE: Sort by textPosition first, then segmentPosition to preserve original ordering
		const sorted = [...request.segments].sort((a, b) => {
			if (a.textPosition !== b.textPosition) return a.textPosition - b.textPosition;
			return a.segmentPosition - b.segmentPosition;
		});

		const textItems = new Map<number, string>();

		for (const segment of sorted) {
			const text = textItems.get(segment.textPosition);
			textItems.set(segment.textPosition, text ? text + segment.text : segment.text);
		}

		const text = Array.from(textItems.values());
		const response = new MergeResponse(request, text);

		this.tracer.info(`Merged ${sorted.length} segments into ${text.length} text item(s).`, response.asLogMetadata());
		return await Promise.resolve(response);
	}
}
