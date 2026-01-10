import type { IDescriptor, IFunctions, SupplyError } from 'intento-core';
import { SupplierBase } from 'intento-core';
import type { IntentoConnectionType } from 'n8n-workflow';

import type { MergeRequest } from 'supply/merge-request';
import { MergeResponse } from 'supply/merge-response';
import { SplitRequest } from 'supply/split-request';
import type { SplitResponse } from 'supply/split-response';

export abstract class SegmentsSupplierBase extends SupplierBase<SplitRequest | MergeRequest, SplitResponse | MergeResponse> {
	constructor(descriptor: IDescriptor, connection: IntentoConnectionType, functions: IFunctions) {
		super(descriptor, connection, functions);
	}

	protected async execute(request: SplitRequest, signal?: AbortSignal): Promise<SplitResponse | MergeResponse | SupplyError> {
		if (request instanceof SplitRequest) return await this.executeSplit(request, signal);
		return await this.executeMerge(request, signal);
	}

	protected abstract executeSplit(request: SplitRequest, signal?: AbortSignal): Promise<SplitResponse | SupplyError>;

	protected async executeMerge(request: MergeRequest, signal?: AbortSignal): Promise<MergeResponse | SupplyError> {
		signal?.throwIfAborted();

		// Sort by text position first, then by segment position
		const sorted = request.segments.sort((a, b) => {
			if (a.textPosition !== b.textPosition) return a.textPosition - b.textPosition;
			return a.segmentPosition - b.segmentPosition;
		});

		// Group segments by text position and merge them
		const textItems = new Map<number, string>();

		for (const translation of sorted) {
			const text = textItems.get(translation.textPosition);
			textItems.set(translation.textPosition, text ? text + translation.text : translation.text);
		}

		return await Promise.resolve(new MergeResponse(request, Array.from(textItems.values())));
	}
}
