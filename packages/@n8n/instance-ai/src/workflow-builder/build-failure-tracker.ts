/**
 * Detects when a build fails with the same signature twice for one work item, so
 * the tool can escalate instead of letting the builder repeat an invalid strategy.
 */

/** Stable signature for a set of build errors, ignoring code frames and numbers. */
export function buildFailureSignature(errors: string[]): string {
	return errors
		.map((error) =>
			error.split('\n\n')[0].toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim(),
		)
		.sort()
		.join(' | ');
}

interface BuildFailureTrackerOptions {
	includeSdkLanguageGuidance?: boolean;
}

const GENERIC_ESCALATION =
	'You already tried this and it failed with the same error. Do not repeat the same approach. ' +
	'Use a different repair strategy for this work item.';

const SDK_LANGUAGE_GUIDANCE =
	'SDK builder code is a restricted subset of TypeScript (see ' +
	'knowledge-base/reference/workflow-sdk-language.md): only SDK builder methods are allowed, not ' +
	'native array/string methods or globals. Build strings with template literals or explicit lines, ' +
	'and move runtime joining, aggregation, or transforms into a Code node or an n8n expression.';

const HTTP_REQUEST_RAW_BODY_GUIDANCE =
	'HTTP Request body rule: specifyBody is only for contentType="json" or ' +
	'contentType="form-urlencoded". For SOAP/XML/raw payloads, set sendBody=true and ' +
	'contentType="raw", put the payload directly in body, set rawContentType to an XML media ' +
	'type such as "text/xml" or "application/xml", and omit specifyBody.';

function repeatedFailureGuidance(errors: string[]): string | undefined {
	const text = errors.join('\n').toLowerCase();
	if (
		text.includes('invalid_parameter') &&
		(text.includes('http request') ||
			text.includes('httprequest') ||
			(text.includes('raw') && text.includes('body') && text.includes('xml'))) &&
		(text.includes('specifybody') ||
			text.includes('jsonbody') ||
			text.includes('body field') ||
			text.includes('body') ||
			text.includes('json body') ||
			(text.includes('xml') && text.includes('json')))
	) {
		return HTTP_REQUEST_RAW_BODY_GUIDANCE;
	}
	return undefined;
}

/** Tracks repeated build-failure signatures per work item within a tool instance. */
export class BuildFailureTracker {
	private readonly history = new Map<string, Set<string>>();

	/**
	 * Records a failure and returns escalation guidance when the same signature
	 * has already been seen for this work item, otherwise undefined.
	 */
	record(
		workItemKey: string,
		errors: string[],
		options: BuildFailureTrackerOptions = {},
	): string | undefined {
		const signature = buildFailureSignature(errors);
		const seen = this.history.get(workItemKey) ?? new Set<string>();
		const repeated = seen.has(signature);
		seen.add(signature);
		this.history.set(workItemKey, seen);
		return repeated
			? [
					GENERIC_ESCALATION,
					repeatedFailureGuidance(errors),
					options.includeSdkLanguageGuidance ? SDK_LANGUAGE_GUIDANCE : '',
				]
					.filter(Boolean)
					.join(' ')
			: undefined;
	}

	/** Clears history once the work item has been saved successfully. */
	clear(workItemKey: string): void {
		this.history.delete(workItemKey);
	}
}
