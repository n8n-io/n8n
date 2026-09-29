import type { InstanceAiQuestion } from '@n8n/api-types';

/** The opening of every onboarding thread: the copy shown before the agent's first turn. */
interface OnboardingOpening {
	/** Thread title from creation, and the heading of the opening card. */
	title: string;
	/**
	 * First assistant message. Markdown: a blank line starts a paragraph, and the chat shows the
	 * paragraphs one after the other before the card. A new paragraph needs its own animation rule
	 * in `InstanceAiConversation.vue`. `{{firstName}}` becomes the user's first name, or "there".
	 */
	greeting: string;
	/**
	 * Steps of the ONE `ask-user` card shown before the agent's first turn, in this order. A
	 * `required` step has no Skip button; the card's own "Something else" free text is the way out
	 * of a `single` or `multi` step. The host skips a step the signup survey already answered; that
	 * answer still reaches the agent. The answers reach the agent in an `<onboarding-answer>` block,
	 * one line per question, so a new question needs no code change.
	 */
	questions: InstanceAiQuestion[];
	/**
	 * Plain assistant text the host posts when the card is answered, with no model turn; the user
	 * types the task in the chat. Free text in an answer skips it: the answers start the agent's
	 * first turn instead. `{{apps}}` becomes the picked apps: one or two names, or "Gmail, Slack,
	 * and your other tools"; none picked: "your tools".
	 */
	followUp: string;
}

// biome-ignore format: one app list per line reads as the table it is
export const ONBOARDING_OPENING: OnboardingOpening = {
	title: 'Welcome to n8n',
	greeting: [
		"Hi {{firstName}}, I'm your Assistant.",
		'Think of me as your n8n expert.',
		'Two final questions, so I can suggest automations for you.',
	].join('\n\n'),
	followUp: 'Got it. Finally, tell me a little about how you use {{apps}}.',
	questions: [
		// The n8n Cloud signup form's team labels, so the answers stay comparable with the Cloud
		// metadata (`what_team_are_you_on`). The card hides options that start with "other"; its
		// "Something else" field stands in for Other. A survey team answers this step, and the card
		// then starts at the apps step with that team's list.
		{
			id: 'team',
			question: 'What team are you on?',
			type: 'single',
			required: true,
			options: ['Executive/Owner', 'Support', 'Product & Design', 'Sales', 'IT', 'Engineering', 'Marketing'],
		},
		// Per team, the 3 tools most typical of that team in the Cloud onboarding data (tools with an
		// n8n node only), then the 4 apps that lead every team: Google Sheets, Gmail, WhatsApp and
		// Telegram. The team tools come first so the personalization shows. `options` shows when no
		// team is known (a free-text team, the survey's "Other"): the 7 apps users without a team add
		// most. The card's "Something else" row is the eighth option. `{{team}}` becomes the team from
		// the signup survey ("in your Sales work"). Without one the words close up ("in your work"):
		// no survey team, "Other", or the team step in the card.
		{
			id: 'apps',
			question: 'Which apps do you use most in your {{team}} work?',
			type: 'multi',
			required: true,
			options: ['Google Sheets', 'Gmail', 'Telegram', 'Google Drive', 'WhatsApp', 'Slack', 'Airtable'],
			optionsByAnswer: {
				questionId: 'team',
				options: {
					'Executive/Owner': ['Google Calendar', 'LinkedIn', 'Slack', 'Google Sheets', 'Gmail', 'WhatsApp', 'Telegram'],
					Support: ['Zendesk', 'Intercom', 'Slack', 'Google Sheets', 'Gmail', 'WhatsApp', 'Telegram'],
					'Product & Design': ['Linear', 'Notion', 'Supabase', 'Google Sheets', 'Gmail', 'WhatsApp', 'Telegram'],
					Sales: ['HubSpot', 'Salesforce', 'LinkedIn', 'Google Sheets', 'Gmail', 'WhatsApp', 'Telegram'],
					IT: ['Slack', 'Microsoft Teams', 'Jira', 'Google Sheets', 'Gmail', 'WhatsApp', 'Telegram'],
					Engineering: ['GitHub', 'Jira', 'Linear', 'Google Sheets', 'Gmail', 'WhatsApp', 'Telegram'],
					Marketing: ['Facebook', 'LinkedIn', 'YouTube', 'Google Sheets', 'Gmail', 'WhatsApp', 'Telegram'],
				},
			},
		},
	],
};
