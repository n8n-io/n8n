import type { GuardrailResult } from '../actions/types';

export function applyPreflightModifications(
	data: string,
	preflightResults: GuardrailResult[],
): string {
	if (preflightResults.length === 0) {
		return data;
	}

	// Get PII mappings from preflight results for individual text processing
	const piiMappings: Record<string, string> = {};
	for (const result of preflightResults) {
		if (result.info?.maskEntities) {
			const detected = result.info.maskEntities;
			for (const [entityType, entities] of Object.entries(detected)) {
				for (const entity of entities) {
					// Map original PII to masked token
					piiMappings[entity] = `<${entityType}>`;
				}
			}
		}
	}

	if (Object.keys(piiMappings).length === 0) {
		return data;
	}

	const maskText = (text: string): string => {
		if (typeof text !== 'string') {
			return text;
		}

		let maskedText = text;

		// Sort PII entities by length (longest first) to avoid partial replacements
		// This ensures longer matches are processed before shorter ones
		const sortedPii = Object.entries(piiMappings).sort((a, b) => b[0].length - a[0].length);

		for (const [originalPii, maskedToken] of sortedPii) {
			if (maskedText.includes(originalPii)) {
				// Use split/join instead of regex to avoid regex injection
				// This treats all characters literally and is safe from special characters
				maskedText = maskedText.split(originalPii).join(maskedToken);
			}
		}

		return maskedText;
	};
	return maskText(data);
}
