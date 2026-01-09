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
		const segments = request.segments;

		// Sort by text position first, then by segment position
		const sorted = segments.sort((a, b) => {
			if (a.textPosition !== b.textPosition) return a.textPosition - b.textPosition;
			return a.segmentPosition - b.segmentPosition;
		});

		// Group segments by text position and merge them
		const grouped = new Map<number, string>();

		for (const segment of sorted) {
			const existing = grouped.get(segment.textPosition);
			grouped.set(segment.textPosition, existing ? existing + segment.text : segment.text);
		}

		return await Promise.resolve(new MergeResponse(request, Array.from(grouped.values())));
	}
}
