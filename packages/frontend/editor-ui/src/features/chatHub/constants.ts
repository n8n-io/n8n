import type { Suggestion } from './chat.types';

// Route and view identifiers
export const CHAT_VIEW = 'chat';

export const CHAT_STORE = 'chatStore';

export const SUGGESTIONS: Suggestion[] = [
	{
		title: 'Brainstorm ideas',
		subtitle: 'for a product launch or campaign',
		icon: '💡',
	},
	{
		title: 'Explain a concept',
		subtitle: "like Docker as if I'm 12",
		icon: '📘',
	},
	{
		title: 'Summarize text',
		subtitle: 'paste content and get a TL;DR',
		icon: '📝',
	},
	{
		title: 'Draft an email',
		subtitle: 'polite follow-up about a bug',
		icon: '✉️',
	},
];
