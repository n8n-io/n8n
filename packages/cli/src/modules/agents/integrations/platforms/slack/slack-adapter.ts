import type { SlackAdapter, SlackAdapterConfig } from '@chat-adapter/slack';
import type { AdapterPostableMessage, WebhookOptions } from 'chat';

import { loadChatSdk, loadSlackAdapter } from '../../esm-loader';
import { renderSlackRichText } from './slack-rich-text';

export async function createSlackSourceAdapter(config: SlackAdapterConfig): Promise<SlackAdapter> {
	const [{ SlackAdapter, SlackFormatConverter }, { parseMarkdown, walkAst }] = await Promise.all([
		loadSlackAdapter(),
		loadChatSdk(),
	]);

	function escapeLiteralAsterisks(markdown: string): string {
		const wordStars = new Set(
			Array.from(
				markdown.matchAll(/(?<=[\p{L}\p{N}])\*(?=[\p{L}\p{N}])/gu),
				(match) => match.index,
			),
		);
		if (wordStars.size < 2) return markdown;
		const markers = new Set<number>();
		walkAst(parseMarkdown(markdown), (node) => {
			if (node.type !== 'emphasis' || !node.position) return node;
			const { start, end } = node.position;
			if (start.offset === undefined || end.offset === undefined) return node;
			const close = end.offset - 1;
			if (wordStars.has(start.offset) && wordStars.has(close)) {
				markers.add(start.offset);
				markers.add(close);
			}
			return node;
		});
		return markdown.replace(/\*/g, (marker, offset) => (markers.has(offset) ? '\\*' : marker));
	}

	class SlackSourceFormatConverter extends SlackFormatConverter {
		override toSlackPayload(message: AdapterPostableMessage) {
			if (typeof message === 'string' || !('markdown' in message)) {
				return super.toSlackPayload(message);
			}
			// CommonMark interprets unspaced multiplication such as a*b*c as emphasis.
			const markdown = escapeLiteralAsterisks(message.markdown);
			// Slack rewrites literal bullets in markdown_text, even in code blocks.
			if (markdown.includes('•')) {
				const payload = renderSlackRichText(parseMarkdown(markdown), markdown);
				if (payload) return payload;
			}
			return super.toSlackPayload({ ...message, markdown });
		}
	}

	class SlackSourceAdapter extends SlackAdapter {
		protected override readonly formatConverter = new SlackSourceFormatConverter();

		protected override processEventPayload(
			payload: Parameters<InstanceType<typeof SlackAdapter>['processEventPayload']>[0],
			options?: WebhookOptions,
		): void {
			const event = payload.event
				? { ...payload.event, n8nWorkspaceId: payload.team_id }
				: undefined;
			super.processEventPayload({ ...payload, event }, options);
		}
	}

	return new SlackSourceAdapter(config);
}
