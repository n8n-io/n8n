import * as ICUSegmentation from '@echogarden/icu-segmentation-wasm';
import { segmentText } from '@echogarden/text-segmentation';
import type { IFunctions, SupplyError } from 'intento-core';
import { NodeConnectionTypes } from 'n8n-workflow';

import { EchoGardenDescriptor } from 'suppliers/echogarden/echogarden-descriptor';
import type { SplitRequest } from 'supply/*';
import { SplitResponse, SegmentsSupplierBase } from 'supply/*';
import type { ISegment } from 'types/*';

ICUSegmentation.initialize().catch(() => {});

export class EchogardenSupplier extends SegmentsSupplierBase {
	constructor(functions: IFunctions) {
		super(EchoGardenDescriptor, NodeConnectionTypes.IntentoSegmentSupplier, functions);

		Object.freeze(this);
	}

	protected async executeSplit(request: SplitRequest, signal?: AbortSignal): Promise<SplitResponse | SupplyError> {
		signal?.throwIfAborted();
		const segments: ISegment[] = [];
		const text = Array.isArray(request.text) ? request.text : [request.text];
		this.tracer.debug(`🪄 [EchoGarden] Segmenting ${text.length} text item(s) with segment limit ${request.segmentLimit} ...`);

		for (let i = 0; i < text.length; i++) {
			if (text[i].length === 0) continue;
			if (text[i].length < request.segmentLimit) {
				segments.push({ text: text[i], textPosition: i, segmentPosition: 0 });
				continue;
			}

			// Segment long text
			const textSegments = await this.segmentText(text[i], request.segmentLimit, request.from);
			const wrappedSegments = textSegments.map((segment, j) => ({ text: segment, textPosition: i, segmentPosition: j }));
			segments.push(...wrappedSegments);
		}

		this.tracer.info(`🪄 [EchoGarden] Segmentation completed. Generated ${segments.length} segment(s) from ${text.length} text item(s).`);
		return new SplitResponse(request, segments);
	}

	private async segmentText(text: string, segmentLimit: number, from?: string): Promise<string[]> {
		const result = await segmentText(text, { enableEastAsianPostprocessing: true, language: from });
		let currentSegment = '';
		const segments: string[] = [];

		for (let i = 0; i < result.sentences.length; i++) {
			const potentialSegment = currentSegment + result.sentences[i].text;
			if (potentialSegment.length <= segmentLimit) {
				currentSegment = potentialSegment;
				continue;
			}
			if (currentSegment.length > 0) segments.push(currentSegment);
			currentSegment = result.sentences[i].text;
		}
		if (currentSegment.length > 0) segments.push(currentSegment);
		return segments;
	}
}
