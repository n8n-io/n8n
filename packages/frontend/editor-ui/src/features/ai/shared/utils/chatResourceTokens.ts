import type { IconName } from '@n8n/design-system';
import { parseChatResourceHref } from '@n8n/utils/chat-tokens';

/** The icons of the resource kinds that a chat token can point to. */
const CHAT_TOKEN_ICONS: Record<string, IconName> = {
	workflow: 'workflow',
	agent: 'robot',
	node: 'box',
	group: 'group',
};

/** The icon of an inline chat token, from the resource kind in its target. */
export function chatResourceTokenIcon(href: string): IconName | undefined {
	const target = parseChatResourceHref(href);
	return target ? CHAT_TOKEN_ICONS[target.kind] : undefined;
}
