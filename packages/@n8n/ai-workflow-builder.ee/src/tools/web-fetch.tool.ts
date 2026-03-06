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
	isUrlInWorkflowNodes,
} from './utils/web-fetch.utils';

interface WebFetchState {
	approvedDomains?: string[];
	allDomainsApproved?: boolean;
	webFetchCount?: number;
	messages?: BaseMessage[];
	userRequest?: string;
	workflowJSON?: { nodes: Array<{ parameters?: Record<string, unknown> }> };
}

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
			message: `The user denied fetching content from ${domain}. Continue without this content.`,
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
 * Factory function to create the web fetch tool
 */
export function createWebFetchTool() {
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

				// 2. Read state for approved domains, fetch count, and messages
				const state = getCurrentTaskInput<WebFetchState>();
				const approvedDomains: string[] = state.approvedDomains ?? [];
				const webFetchCount: number = state.webFetchCount ?? 0;

				// 2b. URL provenance check — only fetch URLs the user provided or from workflow nodes
				const messages = state.messages ?? [];
				const workflowJSON = state.workflowJSON ?? { nodes: [] };
				const urlFromUser = isUrlInUserMessages(url, messages);
				const urlFromWorkflow = isUrlInWorkflowNodes(url, workflowJSON);

				if (!urlFromUser && !urlFromWorkflow) {
					const message =
						'This URL was not provided by the user. Only URLs from the conversation or workflow nodes can be fetched.';
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
				let redirectUserAction: string | undefined;
				const allDomainsApproved = state.allDomainsApproved === true;

				if (
					!allDomainsApproved &&
					!isAllowedDomain(host) &&
					!approvedDomains.includes(host) &&
					!urlFromUser
				) {
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
						const message = `The URL redirected to ${newHost}, which points to a private address. Fetch blocked.`;
						reporter.error({ message });
						return createSuccessResponse(config, message, {
							webFetchCount: webFetchCount + 1,
							fetchedUrlContent: [{ url, status: 'error' as const, title: '', content: message }],
						});
					}

					// If new host not in allowlist and not already approved, ask user
					if (
						!allDomainsApproved &&
						!isAllowedDomain(newHost) &&
						!approvedDomains.includes(newHost)
					) {
						const approval = requestDomainApproval(newHost, fetchResult.finalUrl);
						if (!approval.approved) {
							reporter.error({ message: approval.message });
							return createSuccessResponse(config, approval.message, {
								webFetchCount: webFetchCount + 1,
								fetchedUrlContent: [
									{ url, status: 'error' as const, title: '', content: approval.message },
								],
							});
						}
						redirectUserAction = approval.action;
					}

					// Re-fetch from final URL (host is approved)
					const finalResult = await fetchUrl(fetchResult.finalUrl);
					if (finalResult.status !== 'success' || !finalResult.body) {
						const message = `Failed to fetch content from the redirected URL (${newHost}).`;
						reporter.error({ message });
						return createSuccessResponse(config, message, {
							webFetchCount: webFetchCount + 1,
							fetchedUrlContent: [{ url, status: 'error' as const, title: '', content: message }],
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
						fetchedUrlContent: [{ url, status: 'error' as const, title: '', content: message }],
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
					fetchedUrlContent: [
						{
							url,
							status: 'success' as const,
							title: extracted.title,
							content: extracted.content,
						},
					],
				};

				// Handle "allow_all" — approve all domains globally
				if (userAction === 'allow_all' || redirectUserAction === 'allow_all') {
					stateUpdates.allDomainsApproved = true;
				}

				// Add to approved domains when user chose "allow_domain" or "allow_all"
				const newApprovedDomains: string[] = [];
				if (userAction === 'allow_domain' || userAction === 'allow_all') {
					newApprovedDomains.push(host);
				}
				if (redirectUserAction === 'allow_domain' || redirectUserAction === 'allow_all') {
					newApprovedDomains.push(normalizeHost(fetchResult.finalUrl ?? url));
				}
				if (newApprovedDomains.length > 0) {
					stateUpdates.approvedDomains = newApprovedDomains;
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
- Only URLs from the user's messages or workflow node parameters can be fetched
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
