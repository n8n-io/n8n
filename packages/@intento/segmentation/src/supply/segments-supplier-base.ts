import type { IDescriptor, IFunctions, SupplyError } from 'intento-core';
import { SupplierBase } from 'intento-core';
import type { IntentoConnectionType } from 'n8n-workflow';

import { MergeRequest } from 'supply/merge-request';
import { MergeResponse } from 'supply/merge-response';
import { SplitRequest } from 'supply/split-request';
import type { SplitResponse } from 'supply/split-response';

/**
 * Base class for suppliers that split text into segments and merge segments back.
 *
 * Handles routing between split and merge operations, providing default merge
 * implementation using position-based segment grouping. Subclasses implement
 * executeSplit() with domain-specific segmentation logic.
 */
export abstract class SegmentsSupplierBase extends SupplierBase<SplitRequest | MergeRequest, SplitResponse | MergeResponse> {
	constructor(descriptor: IDescriptor, connection: IntentoConnectionType, functions: IFunctions) {
		super(descriptor, connection, functions);
	}

	/**
	 * Routes requests to appropriate split or merge handler.
	 *
	 * Type exhaustiveness enforced by TypeScript - bugDetected() throws if
	 * request type expands without adding corresponding handler.
	 *
	 * @param signal - Abort signal for cancellation propagation to handlers
	 * @throws Never returns on unsupported type - bugDetected() always throws
	 */
	protected async execute(request: SplitRequest | MergeRequest, signal: AbortSignal): Promise<SplitResponse | MergeResponse | SupplyError> {
		if (request instanceof SplitRequest) return await this.executeSplit(request, signal);
		if (request instanceof MergeRequest) return await this.executeMerge(request, signal);
		this.tracer.bugDetected(this.descriptor.name, `Unsupported request type: ${(request as object).constructor.name}`, { request });
	}

	/**
	 * Splits text into segments using domain-specific logic.
	 *
	 * Implementations must respect segmentLimit and maintain segment ordering
	 * for correct merge reconstruction. Each segment must include textPosition
	 * and segmentPosition for proper reassembly.
	 *
	 * @param signal - Abort signal to check for cancellation during split
	 */
	protected abstract executeSplit(request: SplitRequest, signal: AbortSignal): Promise<SplitResponse | SupplyError>;

	/**
	 * Merges segments back into complete text items by position.
	 *
	 * Groups segments by textPosition, concatenates in segmentPosition order.
	 * Creates shallow copy of segments array to avoid mutating frozen request.
	 *
	 * @param signal - Abort signal checked before merge starts
	 */
	protected async executeMerge(request: MergeRequest, signal: AbortSignal): Promise<MergeResponse | SupplyError> {
		signal.throwIfAborted();

		let message = `${this.descriptor.symbol} Merging ${request.segments.length} segment(s)...`;
		this.tracer.debug(message, request.asLogMetadata());

		// NOTE: Shallow copy prevents mutation of readonly segments array from frozen MergeRequest
		const sorted = [...request.segments].sort((a, b) => {
			if (a.textPosition !== b.textPosition) return a.textPosition - b.textPosition;
			return a.segmentPosition - b.segmentPosition;
		});

		// NOTE: Map preserves insertion order, ensuring textPosition order matches segment sort
		const textItems = new Map<number, string>();

		for (const translation of sorted) {
			const text = textItems.get(translation.textPosition);
			textItems.set(translation.textPosition, text ? text + translation.text : translation.text);
		}

		const text = Array.from(textItems.values());
		const response = new MergeResponse(request, text);

		message = `${this.descriptor.symbol} Merged ${sorted.length} segments into ${text.length} text item(s).`;
		this.tracer.info(message, response.asLogMetadata());
		return await Promise.resolve(response);
	}
}
