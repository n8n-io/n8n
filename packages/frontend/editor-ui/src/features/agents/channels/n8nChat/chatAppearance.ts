/** SPIKE (agent-chat-embed): colours for one scheme. Unset ones use n8n's defaults. */
export interface ColorSet {
	primaryColor?: string;
	backgroundColor?: string;
	textColor?: string;
	agentBubbleColor?: string;
}

/** SPIKE (agent-chat-embed): the chat's appearance, as the server stores it (ChatAppearanceSchema). */
export interface ChatAppearance {
	title?: string;
	welcomeMessage?: string;
	placeholder?: string;
	light?: ColorSet;
	dark?: ColorSet;
	font?: 'system' | 'serif' | 'mono' | 'rounded';
	radius?: number;
	logoUrl?: string;
	colorScheme?: 'light' | 'dark' | 'auto';
	position?: 'right' | 'left';
	launcherIcon?: 'chat' | 'sparkle' | 'help' | 'logo';
}

/** A named instance theme (GET /agent-chat-themes). */
export interface ChatTheme {
	id: string;
	name: string;
	appearance: ChatAppearance;
	usedBy: number;
}

/** What the editor saves for a chat: a theme reference, or its own appearance. */
export interface AppearanceChoice {
	themeId: string | null;
	appearance: ChatAppearance;
}
