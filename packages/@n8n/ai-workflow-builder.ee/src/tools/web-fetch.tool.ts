import { tool } from '@langchain/core/tools';
import { interrupt } from '@langchain/langgraph';
import { randomUUID } from 'crypto';
import { z } from 'zod';

import { WEB_FETCH_MAX_PER_TURN } from '@/constants';
import { ToolExecutionError, ValidationError } from '@/errors';
import { createProgressReporter } from '@/tools/helpers/progress';
import { createSuccessResponse, createErrorResponse } from '@/tools/helpers/response';
import type { BuilderToolBase } from '@/utils/stream-processor';

import type { WebFetchSecurityManager } from './utils/web-fetch-security';
import {
	normalizeHost,
	isBlockedUrl,
	fetchUrl,
	extractReadableContent,
} from './utils/web-fetch.utils';

interface WebFetchResumeValue {
	requestId: string;
	url: string;
	action: string;
}

type ApprovalResult =
	| { approved: true; action: 'allow_once' | 'allow_domain' | 'allow_all' }
	| { approved: false; message: string };

/**
 * Trigger a HITL interrupt to ask the user for domain approval.
 * Returns the user's decision or an error/denial message.
 */
function requestDomainApproval(domain: string, url: string): ApprovalResult {
	const requestId = randomUUID();
	const resumeValue = interrupt<unknown, WebFetchResumeValue>({
		type: 'web_fetch_approval',
		requestId,
		url,
		domain,
	});

	if (resumeValue.url !== url) {
		return {
			approved: false,
			message: 'The approval response did not match the request. Please try again.',
		};
	}

	if (resumeValue.action === 'deny') {
		return {
			approved: false,
			message: `The user denied fetching content from ${domain}.`,
		};
	}

	if (
		resumeValue.action !== 'allow_once' &&
		resumeValue.action !== 'allow_domain' &&
		resumeValue.action !== 'allow_all'
	) {
		return { approved: false, message: 'Invalid approval action. Please try again.' };
	}

	return { approved: true, action: resumeValue.action };
}

export const WEB_FETCH_TOOL: BuilderToolBase = {
	toolName: 'web_fetch',
	displayTitle: 'Fetching web content',

	// Shows "Fetching [URL]" in UI when URL is available, otherwise defaults to "Fetching web content"
	getCustomDisplayTitle: (args: Record<string, unknown>) => {
		const url = typeof args.url === 'string' ? args.url : '';
		if (!url) return 'Fetching web content';
		return `Fetching ${url}`;
	},
};

const webFetchSchema = z.object({
	url: z.string().url().describe('The URL to fetch content from'),
});

/**
 * Factory function to create the web fetch tool.
 */
export function createWebFetchTool(createSecurity: () => WebFetchSecurityManager) {
	const dynamicTool = tool(
		// eslint-disable-next-line complexity
		async (input: unknown, config) => {
			const parsedArgs = typeof input === 'object' && input !== null ? input : {};
			const customTitle = WEB_FETCH_TOOL.getCustomDisplayTitle?.(
				parsedArgs as Record<string, unknown>,
			);
			const reporter = createProgressReporter(
				config,
				WEB_FETCH_TOOL.toolName,
				WEB_FETCH_TOOL.displayTitle,
				customTitle,
			);

			try {
				const validatedInput = webFetchSchema.parse(input);
				const { url } = validatedInput;

				reporter.start(validatedInput);

				// Create a security manager for this invocation
				const security = createSecurity();

				// 1. SSRF check
				reporter.progress('Checking URL safety...');
				const blocked = await isBlockedUrl(url);
				if (blocked) {
					const message =
						'This URL cannot be fetched because it points to a private or internal address.';
					reporter.error({ message });
					return createSuccessResponse(config, message, {
						fetchedUrlContent: [{ url, status: 'error' as const, title: '', content: message }],
					});
				}

				// 2. Check per-turn budget
				if (!security.hasBudget()) {
					const message = `Maximum of ${WEB_FETCH_MAX_PER_TURN} web fetches per turn reached. Please continue without additional fetches.`;
					reporter.error({ message });
					return createSuccessResponse(config, message);
				}

				// 3. Check host approval
				const host = normalizeHost(url);
				let userAction: string | undefined;
				let redirectUserAction: string | undefined;

				// Check if host is already approved
				const hostAllowed = security.isHostAllowed(host, url);

				if (!hostAllowed) {
					const approval = requestDomainApproval(host, url);
					if (!approval.approved) {
						reporter.error({ message: approval.message });
						return createSuccessResponse(config, approval.message, {
							fetchedUrlContent: [
								{ url, status: 'error' as const, title: '', content: approval.message },
							],
						});
					}

					userAction = approval.action;

					if (userAction === 'allow_domain') {
						security.approveDomain(host);
					} else if (userAction === 'allow_all') {
						security.approveAllDomains();
					}
				}

				// 4. Fetch the URL
				reporter.progress('Fetching content...');
				const fetchResult = await fetchUrl(url);

				// Handle unsupported content
				if (fetchResult.status === 'unsupported') {
					security.recordFetch();
					const message = `This content type is not supported: ${fetchResult.reason}. Only HTML pages can be fetched.`;
					reporter.error({ message });
					return createSuccessResponse(config, message, {
						...security.getStateUpdates(),
						fetchedUrlContent: [{ url, status: 'error' as const, title: '', content: message }],
					});
				}

				// Handle redirect to new host
				if (fetchResult.status === 'redirect_new_host' && fetchResult.finalUrl) {
					const newHost = normalizeHost(fetchResult.finalUrl);

					// Update progress title to show the redirected URL
					const redirectTitle = WEB_FETCH_TOOL.getCustomDisplayTitle?.({
						url: fetchResult.finalUrl,
					});
					if (redirectTitle) {
						reporter.setCustomTitle(redirectTitle);
					}

					// Check SSRF on redirected URL
					const redirectBlocked = await isBlockedUrl(fetchResult.finalUrl);
					if (redirectBlocked) {
						security.recordFetch();
						const message = `The URL redirected to ${newHost}, which points to a private address. Fetch blocked.`;
						reporter.error({ message });
						return createSuccessResponse(config, message, {
							...security.getStateUpdates(),
							fetchedUrlContent: [{ url, status: 'error' as const, title: '', content: message }],
						});
					}

					// If new host not allowed, ask user
					if (!security.isHostAllowed(newHost, fetchResult.finalUrl)) {
						const approval = requestDomainApproval(newHost, fetchResult.finalUrl);
						if (!approval.approved) {
							security.recordFetch();
							reporter.error({ message: approval.message });
							return createSuccessResponse(config, approval.message, {
								...security.getStateUpdates(),
								fetchedUrlContent: [
									{ url, status: 'error' as const, title: '', content: approval.message },
								],
							});
						}
						redirectUserAction = approval.action;
						if (redirectUserAction === 'allow_domain') {
							security.approveDomain(newHost);
						} else if (redirectUserAction === 'allow_all') {
							security.approveAllDomains();
						}
					}

					// Re-fetch from final URL (host is approved)
					const finalResult = await fetchUrl(fetchResult.finalUrl);
					if (finalResult.status !== 'success' || !finalResult.body) {
						security.recordFetch();
						const message = `Failed to fetch content from the redirected URL (${newHost}).`;
						reporter.error({ message });
						return createSuccessResponse(config, message, {
							...security.getStateUpdates(),
							fetchedUrlContent: [{ url, status: 'error' as const, title: '', content: message }],
						});
					}

					// Use the redirected result
					Object.assign(fetchResult, finalResult);
					fetchResult.finalUrl = finalResult.finalUrl;
				}

				if (!fetchResult.body) {
					security.recordFetch();
					const message = 'The page returned no content.';
					reporter.error({ message });
					return createSuccessResponse(config, message, {
						...security.getStateUpdates(),
						fetchedUrlContent: [{ url, status: 'error' as const, title: '', content: message }],
					});
				}

				// 5. Extract readable content
				reporter.progress('Extracting content...');
				const extracted = extractReadableContent(fetchResult.body, fetchResult.finalUrl ?? url);

				// 6. Build response
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

				// 7. Record fetch and build state updates
				security.recordFetch();

				const stateUpdates: Record<string, unknown> = {
					...security.getStateUpdates(),
					fetchedUrlContent: [
						{
							url,
							status: 'success' as const,
							title: extracted.title,
							content: extracted.content,
						},
					],
				};

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
				return createErrorResponse(config, toolError, {
					fetchedUrlContent: [
						{
							url: (input as { url?: string })?.url ?? '',
							status: 'error' as const,
							title: '',
							content: toolError.message,
						},
					],
				});
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
- Only public HTTP/HTTPS URLs
- Maximum 3 fetches per conversation turn
- Only text content, PDFs, images, binaries are not supported
- Redirects to a different host may require separate approval`,
			schema: webFetchSchema,
		},
	);

	return {
		tool: dynamicTool,
		...WEB_FETCH_TOOL,
	};
}
