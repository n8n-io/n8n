import { Logger } from '@n8n/backend-common';
import {
	ContextEstablishmentHook,
	ContextEstablishmentOptions,
	ContextEstablishmentResult,
	HookDescription,
	IContextEstablishmentHook,
} from '@n8n/decorators';
import { createContext, Script } from 'node:vm';
import { z } from 'zod';

const HttpHeaderExtractorOptionsSchema = z.object({
	headerName: z.string().default('authorization'),
	headerValue: z.string().default('[Bb][Ee][Aa][Rr][Ee][Rr]\\s+(.+)'),
});

const MAX_HEADER_LENGTH = 8192; // 8KB - reasonable limit for auth headers
const REGEX_TIMEOUT_MS = 100; // 100ms timeout for regex execution

/**
 * Detects potentially dangerous regex patterns that could cause ReDoS.
 * This is a heuristic check - it catches common dangerous patterns but is not comprehensive.
 */
function isUnsafeRegexPattern(pattern: string): boolean {
	// Detect nested quantifiers: (a+)+, (a*)+, (a+)*, etc.
	const nestedQuantifier = /([+*?{]|\{\d+,?\d*\})\s*[)]\s*[+*?{]/;
	// Detect overlapping alternation with quantifier: (a|a)+
	const overlappingAlt = /\([^)]*\|[^)]*\)[+*]/;
	return nestedQuantifier.test(pattern) || overlappingAlt.test(pattern);
}

function isHeaderObject(obj: unknown): obj is Record<string, unknown> {
	return obj !== null && obj !== undefined && typeof obj === 'object' && !Array.isArray(obj);
}

// Reusable VM context and pre-compiled script for safe regex execution
// This avoids memory overhead of creating new contexts per call
const regexContext = createContext({
	RegExp,
	pattern: '',
	input: '',
	result: null as RegExpExecArray | null,
});
const regexScript = new Script('result = new RegExp(pattern).exec(input)');

/**
 * Executes a regex with a timeout to prevent ReDoS attacks.
 * Uses a reusable VM context to minimize memory overhead.
 *
 * @returns The match result, or null if no match or timeout occurred
 * @throws Error if the pattern is invalid
 */
function safeRegexExec(
	pattern: string,
	input: string,
	timeoutMs = REGEX_TIMEOUT_MS,
): RegExpExecArray | null {
	regexContext.pattern = pattern;
	regexContext.input = input;
	regexContext.result = null;

	try {
		regexScript.runInContext(regexContext, { timeout: timeoutMs });
		return regexContext.result as RegExpExecArray | null;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
			return null;
		}
		throw error;
	}
}

@ContextEstablishmentHook()
export class HttpHeaderExtractor implements IContextEstablishmentHook {
	constructor(private readonly logger: Logger) {}

	hookDescription: HookDescription = {
		name: 'HttpHeaderExtractor',
		displayName: 'HTTP Header Extractor',
		options: [
			{
				name: 'headerName',
				displayName: 'Header Name',
				type: 'string',
				default: 'authorization',
				description: 'The name of the HTTP header to extract the value from.',
			},
			{
				name: 'headerValue',
				displayName: 'Header Value Pattern',
				type: 'string',
				default: '[Bb][Ee][Aa][Rr][Ee][Rr]\\s+(.+)',
				description:
					'A regular expression pattern to extract the identity from the header value. Use a capturing group to specify the identity part.',
			},
		],
	};

	isApplicableToTriggerNode(nodeType: string): boolean {
		return nodeType === 'n8n-nodes-base.webhook' || nodeType === 'webhook';
	}

	async execute(options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
		if (!options.triggerItems || options.triggerItems.length === 0) {
			this.logger.debug('No trigger items found, skipping HttpHeaderExtractor hook.');
			return {};
		}

		const httpHeaderOptions = await HttpHeaderExtractorOptionsSchema.safeParseAsync(
			options.options ?? {},
		);

		if (httpHeaderOptions.error) {
			this.logger.error('Invalid options for HttpHeaderExtractor hook.', {
				error: httpHeaderOptions.error,
			});
			return {};
		}

		const normalizedHeaderName = httpHeaderOptions.data.headerName.toLowerCase();
		const pattern = httpHeaderOptions.data.headerValue;

		// Validate pattern safety to prevent ReDoS (defense in depth)
		if (isUnsafeRegexPattern(pattern)) {
			this.logger.warn('Potentially unsafe regex pattern rejected', { pattern });
			return {};
		}

		const [triggerItem] = options.triggerItems;
		const headers = triggerItem.json['headers'];

		if (isHeaderObject(headers) && normalizedHeaderName in headers) {
			const headerValue = headers[normalizedHeaderName];

			if (typeof headerValue === 'string') {
				headers[normalizedHeaderName] = '**********'; // Mask the header value in the trigger item

				// Limit input length to mitigate ReDoS on long inputs
				const truncatedValue = headerValue.slice(0, MAX_HEADER_LENGTH);

				try {
					const match = safeRegexExec(pattern, truncatedValue);

					if (match?.[1]) {
						return {
							triggerItems: options.triggerItems,
							contextUpdate: {
								credentials: {
									version: 1,
									identity: match[1],
									metadata: { source: 'http-header', headerName: normalizedHeaderName },
								},
							},
						};
					} else {
						return {
							triggerItems: options.triggerItems,
						};
					}
				} catch (error) {
					this.logger.error('Invalid regex pattern', { pattern, error });
					return {
						triggerItems: options.triggerItems,
					};
				}
			}
		}

		return {};
	}
}
