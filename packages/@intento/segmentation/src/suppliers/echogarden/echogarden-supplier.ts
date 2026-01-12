import * as ICUSegmentation from '@echogarden/icu-segmentation-wasm';
import { segmentText } from '@echogarden/text-segmentation';
import { ContextFactory, type IFunctions, type SupplyError } from 'intento-core';
import { NodeConnectionTypes } from 'n8n-workflow';

import { SuppressionContext } from 'context/suppression-context';
import { EchoGardenDescriptor } from 'suppliers/echogarden/echogarden-descriptor';
import type { SplitRequest } from 'supply/*';
import { SplitResponse, SegmentsSupplierBase } from 'supply/*';
import type { ISegment } from 'types/*';

/**
 * ICU-based text segmentation supplier with custom suppression support.
 *
 * Uses EchoGarden's ICU segmentation for accurate sentence boundary detection
 * across multiple languages. Supports custom suppression patterns to prevent
 * splitting at abbreviations and domain-specific tokens. WASM module initialized
 * once per process using singleton pattern for performance.
 */
export class EchoGardenSupplier extends SegmentsSupplierBase {
	private static icuInitialized: Promise<void> | null = null;
	private readonly context: SuppressionContext;

	constructor(functions: IFunctions) {
		super(EchoGardenDescriptor, NodeConnectionTypes.IntentoSegmentSupplier, functions);

		this.context = ContextFactory.read<SuppressionContext>(SuppressionContext, functions, this.tracer);

		Object.freeze(this);
	}

	/**
	 * Splits text into segments using ICU sentence boundaries with suppression support.
	 *
	 * Processes text items individually, applying segment length limits while respecting
	 * sentence boundaries. Atomic sentences exceeding segmentLimit are preserved intact
	 * for semantic integrity. Empty text items are skipped.
	 *
	 * @param signal - Abort signal checked at method start and each text item iteration
	 */
	protected async executeSplit(request: SplitRequest, signal: AbortSignal): Promise<SplitResponse | SupplyError> {
		signal.throwIfAborted();
		await this.initializeICU();

		const segments: ISegment[] = [];
		const text = Array.isArray(request.text) ? request.text : [request.text];
		const suppressions = this.context.enabled && this.context.list ? this.context.list : [];

		let message = `${this.descriptor.symbol} Splitting ${text.length} text item(s) into segments with limit ${request.segmentLimit} applying ${suppressions.length} suppressions...`;
		this.tracer.debug(message, request.asLogMetadata());

		for (let i = 0; i < text.length; i++) {
			signal.throwIfAborted();
			if (text[i].length < request.segmentLimit) {
				segments.push({ text: text[i], textPosition: i, segmentPosition: 0 });
				continue;
			}

			// NOTE: Only text items exceeding segmentLimit require ICU sentence segmentation
			const textSegments = await this.segmentText(text[i], request.segmentLimit, suppressions, request.from);
			const wrappedSegments = textSegments.map((segment, j) => ({ text: segment, textPosition: i, segmentPosition: j }));
			segments.push(...wrappedSegments);
		}

		message = `${this.descriptor.symbol} Text has been split into ${segments.length} segments.`;
		const response = new SplitResponse(request, segments);
		this.tracer.debug(message, response.asLogMetadata());
		return response;
	}

	/**
	 * Ensures ICU Segmentation WASM module is initialized exactly once per process.
	 *
	 * Uses singleton pattern to prevent duplicate initialization. On failure, resets
	 * cached promise to null allowing retry on next attempt rather than permanently
	 * caching rejection.
	 *
	 * @throws Error from ICUSegmentation.initialize() if WASM module load fails
	 */
	private async initializeICU(): Promise<void> {
		EchoGardenSupplier.icuInitialized ??= ICUSegmentation.initialize()
			.then(() => {
				this.tracer.info(`${this.descriptor.symbol} ICU Segmentation WASM module initialized.`);
			})
			.catch((error) => {
				this.tracer.error(`${this.descriptor.symbol} Failed to initialize ICU Segmentation WASM module.`, { error });
				EchoGardenSupplier.icuInitialized = null;
				throw error;
			});
		return await EchoGardenSupplier.icuInitialized;
	}

	/**
	 * Segments text into chunks respecting sentence boundaries and length limit.
	 *
	 * Combines sentences until adding next would exceed segmentLimit. If individual
	 * sentence exceeds limit, it's preserved as atomic segment to maintain semantic
	 * integrity. Applies custom suppressions to prevent splitting at abbreviations.
	 *
	 * @param segmentLimit - Target maximum segment length; individual sentences may exceed
	 * @param suppressions - Patterns to prevent sentence splits (e.g., "Dr.", "Inc.")
	 * @param from - Optional language hint for ICU segmentation rules
	 */
	private async segmentText(text: string, segmentLimit: number, suppressions: string[], from?: string): Promise<string[]> {
		const options = { enableEastAsianPostprocessing: true, language: from, customSuppressions: suppressions };
		const result = await segmentText(text, options);
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
