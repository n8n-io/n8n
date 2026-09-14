export type MCPOnboardingClient = 'claude' | 'claude_code' | 'codex' | 'cursor' | 'chatgpt';

export type MCPOnboardingClientOption = {
	value: MCPOnboardingClient;
	slug: string;
	label: string;
};
