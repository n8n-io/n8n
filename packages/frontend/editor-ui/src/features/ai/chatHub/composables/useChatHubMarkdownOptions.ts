import { useChatMarkdownOptions } from '@/features/ai/shared/components/ChatMarkdown/useChatMarkdownOptions';
export { shouldOpenChatMarkdownLinkInNewTab } from '@/features/ai/shared/components/ChatMarkdown/useChatMarkdownOptions';

export function useChatHubMarkdownOptions(
	codeBlockActionsClassName: string,
	tableContainerClassName: string,
	footnoteRefClassName: string | null,
) {
	return useChatMarkdownOptions(
		{ math: true, footnotes: footnoteRefClassName ? 'pill' : 'normal', codeActions: true },
		codeBlockActionsClassName,
		tableContainerClassName,
		footnoteRefClassName,
	);
}
