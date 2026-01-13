import * as ICUSegmentation from '@echogarden/icu-segmentation-wasm';
import { segmentText } from '@echogarden/text-segmentation';
import { ContextFactory, type IFunctions, type SupplyError } from 'intento-core';
import { NodeConnectionTypes } from 'n8n-workflow';

import { SuppressionContext } from 'context/*';
import { EchoGardenDescriptor } from 'suppliers/echogarden/echogarden-descriptor';
import type { SplitRequest } from 'supply/*';
import { SplitResponse, SegmentsSupplierBase } from 'supply/*';
import type { ISegment } from 'types/*';

/**
 * ICU-based text segmentation supplier with custom suppression support.
 *
 * Uses @echogarden/text-segmentation for accurate sentence boundary detection
 * across multiple languages. Supports custom suppressions to prevent splitting
 * at domain-specific abbreviations (e.g., "Dr.", "Inc.").
 */
export class EchoGardenSupplier extends SegmentsSupplierBase {
	private static icuInitialized: Promise<void> | null = null;
	private readonly context: SuppressionContext;

	/**
	 * Initializes supplier with ICU segmentation and reads suppression context.
	 *
	 * @param functions - n8n workflow functions for context access and logging
	 */
	constructor(functions: IFunctions) {
		super(EchoGardenDescriptor, NodeConnectionTypes.IntentoSegmentSupplier, functions);

		this.context = ContextFactory.read<SuppressionContext>(SuppressionContext, functions, this.tracer);

		Object.freeze(this);
	}

	/**
	 * Splits text items into segments using ICU sentence segmentation.
	 *
	 * Text shorter than segmentLimit passes through unchanged. Longer text splits
	 * at sentence boundaries, combining sentences until limit reached. Final segment
	 * may exceed limit if single sentence too long.
	 *
	 * @param request - Split request with text items and segment size limit
	 * @param signal - Abort signal for cancellation (checked per text item)
	 * @returns Split response with positioned segments for merge reconstruction
	 */
	protected async executeSplit(request: SplitRequest, signal: AbortSignal): Promise<SplitResponse | SupplyError> {
		signal.throwIfAborted();
		await this.initializeICU();

		const segments: ISegment[] = [];
		// NOTE: Defensive handling - returns empty array if context.list undefined (validation not required)
		const suppressions = this.context.enabled && this.context.list ? this.context.list : [];

		const message = `Splitting ${request.text.length} text item(s) into segments with limit ${request.segmentLimit} applying ${suppressions.length} suppressions...`;
		this.tracer.debug(message, request.asLogMetadata());

		for (let i = 0; i < request.text.length; i++) {
			signal.throwIfAborted();
			// NOTE: Text shorter than limit doesn't require segmentation - pass through as single segment
			if (request.text[i].length < request.segmentLimit) {
				segments.push({ text: request.text[i], textPosition: i, segmentPosition: 0 });
				continue;
			}

			const textSegments = await this.segmentText(request.text[i], request.segmentLimit, suppressions, request.from);
			const wrappedSegments = textSegments.map((segment, j) => ({ text: segment, textPosition: i, segmentPosition: j }));
			segments.push(...wrappedSegments);
		}

		const response = new SplitResponse(request, segments);
		this.tracer.debug(`Text has been split into ${segments.length} segments.`, response.asLogMetadata());
		return response;
	}

	/**
	 * Initializes ICU segmentation WASM module (singleton pattern).
	 *
	 * First call initializes module, subsequent calls await same promise.
	 * On failure, resets to null allowing retry on next call.
	 *
	 * @throws Error if ICU initialization fails (logged and re-thrown)
	 */
	private async initializeICU(): Promise<void> {
		EchoGardenSupplier.icuInitialized ??= ICUSegmentation.initialize()
			.then(() => {
				this.tracer.info(`${this.descriptor.symbol} ICU Segmentation WASM module initialized.`);
			})
			.catch((error) => {
				this.tracer.error(`${this.descriptor.symbol} Failed to initialize ICU Segmentation WASM module.`, { error });
				// NOTE: Reset to null on error allows retry on next call instead of caching failed promise
				EchoGardenSupplier.icuInitialized = null;
				throw error;
			});
		return await EchoGardenSupplier.icuInitialized;
	}

	/**
	 * Segments text by accumulating sentences until limit reached.
	 *
	 * Combines consecutive sentences into segments while staying under limit.
	 * When adding next sentence would exceed limit, pushes accumulated segment
	 * and starts new one. Final segment may exceed limit if single sentence too long.
	 *
	 * @param text - Text to segment
	 * @param segmentLimit - Maximum characters per segment (soft limit per sentence)
	 * @param suppressions - Abbreviations that should NOT trigger sentence breaks
	 * @param from - Optional language code for language-specific segmentation rules
	 * @returns Array of text segments (may be empty if no sentences detected)
	 */
	private async segmentText(text: string, segmentLimit: number, suppressions: string[], from?: string): Promise<string[]> {
		const options = { enableEastAsianPostprocessing: true, language: from, customSuppressions: suppressions };
		const result = await segmentText(text, options);
		let currentSegment = '';
		const segments: string[] = [];

		// NOTE: Accumulate sentences while under limit. On overflow, push current segment and start new one.
		// If single sentence exceeds limit, it becomes standalone segment (soft limit per sentence).
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
