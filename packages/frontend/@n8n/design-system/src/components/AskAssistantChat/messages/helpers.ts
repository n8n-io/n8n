import type { ChatUI } from '@n8n/design-system/types';

import BlockMessage from './BlockMessage.vue';
import CodeDiffMessage from './CodeDiffMessage.vue';
import ErrorMessage from './ErrorMessage.vue';
import EventMessage from './EventMessage.vue';
import TextMessage from './TextMessage.vue';
import ToolMessage from './ToolMessage.vue';

export function getSupportedMessageComponent(type: ChatUI.AssistantMessage['type']) {
	switch (type) {
		case 'text':
			return TextMessage;
		case 'block':
			return BlockMessage;
		case 'code-diff':
			return CodeDiffMessage;
		case 'error':
			return ErrorMessage;
		case 'event':
			return EventMessage;
		case 'tool':
			return ToolMessage;
		case 'agent-suggestion':
		case 'workflow-updated':
		case 'custom':
			return null;
		default:
			return null;
	}
}
