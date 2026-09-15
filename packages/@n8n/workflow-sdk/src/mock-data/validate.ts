import type { NodeSchemaContext, PinData } from './types';

/** One pinned node whose item keys deviate from its declared field-name contract. */
export interface PinFieldViolation {
	nodeName: string;
	/** Keys present on pinned items but absent from the declared contract. */
	unknownKeys: string[];
	/** Declared keys missing from pinned items — reported only for `exact` contracts. */
	missingKeys: string[];
	declaredKeys: string[];
	envelopeKey?: string;
}

/**
 * Compare generated pin data against each node's declared field-name contract
 * (extractor attributes, parser schema keys, real Data Table columns).
 * Near-miss renames (`invoice_amount` for `total_amount`, `email` for
 * `contact_email`) are the dominant residual mock defect in eval runs — they
 * make correctly-built downstream expressions resolve undefined. Run this
 * AFTER `repairStructuredOutput` so envelope shape is already canonical.
 *
 * Deliberately detect-only: renaming keys here could fabricate
 * scenario-relevant data and mask real generation defects — callers should
 * regenerate on violations and fail loud when drift persists.
 */
export function collectPinFieldViolations(
	pinData: PinData,
	contexts: NodeSchemaContext[],
): PinFieldViolation[] {
	const violations: PinFieldViolation[] = [];

	for (const ctx of contexts) {
		const contract = ctx.declaredFields;
		if (!contract) continue;
		const items = pinData[ctx.nodeName];
		if (!items || items.length === 0) continue; // `[]` is a valid zero-item pin

		const declared = new Set(contract.keys);
		const unknownKeys = new Set<string>();
		// Exact contracts (Data Table rows) require every declared key on EVERY
		// item — real rows always carry every column.
		const missingKeySet = new Set<string>();

		for (const item of items) {
			const json = item.json;
			if (typeof json !== 'object' || json === null || Array.isArray(json)) {
				// A malformed item (`{"json": "not a row"}`, `{"json": []}`) carries no
				// field names at all. Under an exact contract that IS the violation —
				// skipping it let the pin pass validation with rows no downstream
				// column expression can resolve.
				if (contract.exact) for (const key of contract.keys) missingKeySet.add(key);
				continue;
			}
			let fields = json as Record<string, unknown>;
			if (contract.envelopeKey) {
				const enveloped = fields[contract.envelopeKey];
				// Non-object envelopes (e.g. a plain-text agent answer) carry no
				// field names to check.
				if (typeof enveloped !== 'object' || enveloped === null || Array.isArray(enveloped)) {
					continue;
				}
				fields = enveloped as Record<string, unknown>;
			}
			for (const key of Object.keys(fields)) {
				if (!declared.has(key)) unknownKeys.add(key);
			}
			if (contract.exact) {
				for (const key of contract.keys) {
					if (!(key in fields)) missingKeySet.add(key);
				}
			}
		}

		const missingKeys = [...missingKeySet];

		if (unknownKeys.size > 0 || missingKeys.length > 0) {
			violations.push({
				nodeName: ctx.nodeName,
				unknownKeys: [...unknownKeys],
				missingKeys,
				declaredKeys: contract.keys,
				envelopeKey: contract.envelopeKey,
			});
		}
	}

	return violations;
}

/** Corrective follow-up message for a regeneration attempt after field-name drift. */
export function buildFieldViolationRetryMessage(violations: PinFieldViolation[]): string {
	const lines = [
		'Your previous response used field names that do not exist on the nodes below.',
		'Regenerate the COMPLETE JSON object (every node, same format), keeping all values scenario-consistent, but use EXACTLY the declared field names — do not rename, synonymize, or invent fields.',
		'Keep the SAME number of items per node as before — do not satisfy a correction by dropping items or returning an empty array unless the scenario itself requires zero items:',
		'',
	];
	for (const v of violations) {
		const location = v.envelopeKey ? ` (inside the \`${v.envelopeKey}\` object)` : '';
		lines.push(`- ${v.nodeName}${location}:`);
		if (v.unknownKeys.length > 0) {
			lines.push(`  - remove/rename these unknown fields: ${v.unknownKeys.join(', ')}`);
		}
		if (v.missingKeys.length > 0) {
			lines.push(`  - every item must also carry: ${v.missingKeys.join(', ')}`);
		}
		lines.push(`  - the ONLY valid field names are: ${v.declaredKeys.join(', ')}`);
	}
	return lines.join('\n');
}
