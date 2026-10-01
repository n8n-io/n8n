import type { IExecuteFunctions, ISupplyDataFunctions } from 'n8n-workflow';

export function getMetadataFiltersValues(
	ctx: IExecuteFunctions | ISupplyDataFunctions,
	itemIndex: number,
): Record<string, never> | undefined {
	const options = ctx.getNodeParameter('options', itemIndex, {});

	if (options.metadata) {
		const { metadataValues: metadata } = options.metadata as {
			metadataValues: Array<{
				name: string;
				value: string;
			}>;
		};
		if (metadata.length > 0) {
			return metadata.reduce((acc, { name, value }) => ({ ...acc, [name]: value }), {});
		}
	}

	if (options.searchFilterJson) {
		return ctx.getNodeParameter('options.searchFilterJson', itemIndex, '', {
			ensureType: 'object',
		}) as Record<string, never>;
	}

	return undefined;
}

/**
 * Detects if a text contains a character that repeats sequentially for a specified threshold.
 * This is used to prevent performance issues with tiktoken on highly repetitive content.
 * @param text The text to check
 * @param threshold The minimum number of sequential repeats to detect (default: 1000)
 * @returns true if a character repeats sequentially for at least the threshold amount
 */
export function hasLongSequentialRepeat(text: string, threshold = 1000): boolean {
	try {
		// Validate inputs
		if (
			text === null ||
			typeof text !== 'string' ||
			text.length === 0 ||
			threshold <= 0 ||
			text.length < threshold
		) {
			return false;
		}
		// Use string iterator to avoid creating array copy (memory efficient)
		const iterator = text[Symbol.iterator]();
		let prev = iterator.next();

		if (prev.done) {
			return false;
		}

		let count = 1;
		for (const char of iterator) {
			if (char === prev.value) {
				count++;
				if (count >= threshold) {
					return true;
				}
			} else {
				count = 1;
				prev = { value: char, done: false };
			}
		}

		return false;
	} catch (error) {
		// On any error, return false to allow normal processing
		return false;
	}
}
