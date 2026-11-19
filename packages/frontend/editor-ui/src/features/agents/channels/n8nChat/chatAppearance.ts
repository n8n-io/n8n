/** SPIKE (agent-chat-embed): the chat's appearance, as the server stores it (ChatAppearanceSchema). */
export interface ChatAppearance {
	title?: string;
	welcomeMessage?: string;
	placeholder?: string;
	primaryColor?: string;
	backgroundColor?: string;
	textColor?: string;
	agentBubbleColor?: string;
	font?: 'system' | 'serif' | 'mono' | 'rounded';
	radius?: number;
	logoUrl?: string;
	colorScheme?: 'light' | 'dark' | 'auto';
	position?: 'right' | 'left';
	launcherIcon?: 'chat' | 'sparkle' | 'help' | 'logo';
}
