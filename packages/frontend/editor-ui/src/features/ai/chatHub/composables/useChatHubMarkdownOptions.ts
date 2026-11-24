import { useChatMarkdownOptions } from '@/features/ai/shared/components/ChatMarkdown/useChatMarkdownOptions';
export { shouldOpenChatMarkdownLinkInNewTab } from '@/features/ai/shared/components/ChatMarkdown/useChatMarkdownOptions';

export function useChatHubMarkdownOptions(
	tableContainerClassName: string,
	footnoteRefClassName: string | null,
) {
	return useChatMarkdownOptions(
		{ math: true, footnotes: footnoteRefClassName ? 'pill' : 'normal' },
		tableContainerClassName,
		footnoteRefClassName,
	);
}
