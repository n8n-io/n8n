import type { BaseMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { interrupt, getCurrentTaskInput } from '@langchain/langgraph';
import { randomUUID } from 'crypto';
import { z } from 'zod';

import { WEB_FETCH_MAX_PER_TURN } from '@/constants';
import { ToolExecutionError, ValidationError } from '@/errors';
import { createProgressReporter } from '@/tools/helpers/progress';
import { createSuccessResponse, createErrorResponse } from '@/tools/helpers/response';
import type { BuilderToolBase } from '@/utils/stream-processor';

import { isAllowedDomain } from './utils/allowed-domains';
import {
	normalizeHost,
	isBlockedUrl,
	fetchUrl,
	extractReadableContent,
	isUrlInUserMessages,
} from './utils/web-fetch.utils';

export const WEB_FETCH_TOOL: BuilderToolBase = {
	toolName: 'web_fetch',
	displayTitle: 'Fetching web content',
};

const webFetchSchema = z.object({
	url: z.string().url().describe('The URL to fetch content from'),
});

/**
 * Factory function to create the web fetch tool
 */
export function createWebFetchTool() {
	const dynamicTool = tool(
		// eslint-disable-next-line complexity
		async (input: unknown, config) => {
			const reporter = createProgressReporter(
				config,
				WEB_FETCH_TOOL.toolName,
				WEB_FETCH_TOOL.displayTitle,
			);

			try {
				const validatedInput = webFetchSchema.parse(input);
				const { url } = validatedInput;

				reporter.start(validatedInput);

				// 1. SSRF check
				reporter.progress('Checking URL safety...');
				const blocked = await isBlockedUrl(url);
				if (blocked) {
					const message =
						'This URL cannot be fetched because it points to a private or internal address.';
					reporter.error({ message });
					return createSuccessResponse(config, message);
				}

				// 2. Read state for approved domains, fetch count, and messages
				const state = getCurrentTaskInput() as {
					approvedDomains?: string[];
					webFetchCount?: number;
					messages?: BaseMessage[];
				};
				const approvedDomains: string[] = state.approvedDomains ?? [];
				const webFetchCount: number = state.webFetchCount ?? 0;

				// 2b. URL provenance check — only fetch URLs the user provided
				const messages = state.messages ?? [];
				if (!isUrlInUserMessages(url, messages)) {
					const message =
						'This URL was not provided by the user. Only URLs from the conversation can be fetched.';
					reporter.error({ message });
					return createSuccessResponse(config, message);
				}

				// 3. Check per-turn budget
				if (webFetchCount >= WEB_FETCH_MAX_PER_TURN) {
					const message = `Maximum of ${WEB_FETCH_MAX_PER_TURN} web fetches per turn reached. Please continue without additional fetches.`;
					reporter.error({ message });
					return createSuccessResponse(config, message);
				}

				// 4. Check host approval
				const host = normalizeHost(url);
				let userAction: string | undefined;

				if (!isAllowedDomain(host) && !approvedDomains.includes(host)) {
					// Trigger HITL interrupt for approval.
					// Note: LangGraph re-executes the tool from the top on resume, so randomUUID()
					// produces a different value each run. The requestId in the resume payload
					// is the one from the original interrupt; we validate via url match instead.
					const requestId = randomUUID();
					const resumeValue = interrupt({
						type: 'web_fetch_approval',
						requestId,
						url,
						domain: host,
					});

					// Validate resume payload — url is deterministic (from tool input),
					// requestId is not (regenerated on re-execution), so only check url.
					if (resumeValue.url !== url) {
						const message = 'The approval response did not match the request. Please try again.';
						reporter.error({ message });
						return createSuccessResponse(config, message);
					}

					if (resumeValue.action === 'deny') {
						const message = `The user denied fetching content from ${host}. Continue without this content.`;
						reporter.error({ message });
						return createSuccessResponse(config, message);
					}

					// Validate action against allowlist
					if (resumeValue.action !== 'allow_once' && resumeValue.action !== 'allow_domain') {
						const message = 'Invalid approval action. Please try again.';
						reporter.error({ message });
						return createSuccessResponse(config, message);
					}

					userAction = resumeValue.action;
					// allow_once or allow_domain — proceed
				}

				// 5. Fetch the URL
				reporter.progress('Fetching content...');
				const fetchResult = await fetchUrl(url);

				// Handle unsupported content
				if (fetchResult.status === 'unsupported') {
					const message = `This content type is not supported: ${fetchResult.reason}. The tool cannot process PDF files.`;
					reporter.error({ message });
					return createSuccessResponse(config, message, {
						webFetchCount: webFetchCount + 1,
					});
				}

				// Handle redirect to new host
				if (fetchResult.status === 'redirect_new_host' && fetchResult.finalUrl) {
					const newHost = normalizeHost(fetchResult.finalUrl);

					// Check SSRF on redirected URL
					const redirectBlocked = await isBlockedUrl(fetchResult.finalUrl);
					if (redirectBlocked) {
						const message = `The URL redirected to ${newHost}, which points to a private address. Fetch blocked.`;
						reporter.error({ message });
						return createSuccessResponse(config, message, {
							webFetchCount: webFetchCount + 1,
						});
					}

					// If new host not approved, block (don't interrupt again to keep flow simple)
					if (!approvedDomains.includes(newHost)) {
						const message = `The URL redirected to a different domain (${newHost}). The user has not approved this domain. Please ask the user to provide the final URL directly.`;
						reporter.error({ message });
						return createSuccessResponse(config, message, {
							webFetchCount: webFetchCount + 1,
						});
					}

					// Re-fetch from final URL (host is approved)
					const finalResult = await fetchUrl(fetchResult.finalUrl);
					if (finalResult.status !== 'success' || !finalResult.body) {
						const message = `Failed to fetch content from the redirected URL (${newHost}).`;
						reporter.error({ message });
						return createSuccessResponse(config, message, {
							webFetchCount: webFetchCount + 1,
						});
					}

					// Use the redirected result
					Object.assign(fetchResult, finalResult);
					fetchResult.finalUrl = finalResult.finalUrl;
				}

				if (!fetchResult.body) {
					const message = 'The page returned no content.';
					reporter.error({ message });
					return createSuccessResponse(config, message, {
						webFetchCount: webFetchCount + 1,
					});
				}

				// 6. Extract readable content
				reporter.progress('Extracting content...');
				const extracted = extractReadableContent(fetchResult.body, fetchResult.finalUrl ?? url);

				// 7. Build response
				const responseLines = [
					'<web_fetch_result>',
					`<url>${url}</url>`,
					fetchResult.finalUrl && fetchResult.finalUrl !== url
						? `<final_url>${fetchResult.finalUrl}</final_url>`
						: '',
					`<title>${extracted.title}</title>`,
					extracted.truncated ? `<note>${extracted.truncateReason}</note>` : '',
					'<content>',
					extracted.content,
					'</content>',
					'</web_fetch_result>',
				]
					.filter(Boolean)
					.join('\n');

				// 8. Build state updates
				const stateUpdates: Record<string, unknown> = {
					webFetchCount: webFetchCount + 1,
				};

				// Add to approved domains only when user chose "allow_domain"
				if (userAction === 'allow_domain') {
					stateUpdates.approvedDomains = [host];
				}

				reporter.complete({
					status: 'success',
					url,
					finalUrl: fetchResult.finalUrl,
					truncated: extracted.truncated,
				});

				return createSuccessResponse(config, responseLines, stateUpdates);
			} catch (error) {
				if (error instanceof z.ZodError) {
					const validationError = new ValidationError('Invalid URL input', {
						extra: { errors: error.errors },
					});
					reporter.error(validationError);
					return createErrorResponse(config, validationError);
				}

				// Don't catch interrupt errors - they need to propagate
				if (
					error instanceof Error &&
					(error.name === 'GraphInterrupt' || error.constructor.name === 'GraphInterrupt')
				) {
					throw error;
				}

				const toolError = new ToolExecutionError(
					error instanceof Error ? error.message : 'Failed to fetch URL',
					{
						toolName: WEB_FETCH_TOOL.toolName,
						cause: error instanceof Error ? error : undefined,
					},
				);
				reporter.error(toolError);
				return createErrorResponse(config, toolError);
			}
		},
		{
			name: WEB_FETCH_TOOL.toolName,
			description: `Fetch the content of a web page and extract its readable text.

Use when:
- User pastes a URL to documentation, API reference, or external resource
- You need external documentation to configure an HTTP Request node
- A node references an external URL with relevant configuration details

The tool will request user approval before fetching any URL.
After approval, it returns the page's readable text content.

Constraints:
- Only URLs that appear in the user's messages can be fetched
- Only public HTTP/HTTPS URLs
- Maximum 3 fetches per conversation turn
- PDFs are not supported
- Redirects to a different host may require separate approval`,
			schema: webFetchSchema,
		},
	);

	return {
		tool: dynamicTool,
		...WEB_FETCH_TOOL,
	};
}
