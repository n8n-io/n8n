import type { InstanceAiQuestion } from '@n8n/api-types';

/**
 * The opening of every onboarding thread: the copy shown before the agent's first turn. One intent
 * card comes first, then each route gets its own next step. Every card is host-seeded, with no
 * model turn. Each card's answers reach the agent in an `<onboarding-answer>` block, one line per
 * question, so a new question needs no code change.
 */
interface OnboardingOpening {
	/** Thread title from creation, and the heading of every card. */
	title: string;
	/**
	 * First assistant message. Markdown: a blank line starts a paragraph, and the chat shows the
	 * paragraphs one after the other before the card. A new paragraph needs its own animation rule
	 * in `InstanceAiConversation.vue`. `{{firstName}}` becomes the user's first name, or "there".
	 */
	greeting: string;
	/**
	 * The first card. Each option picks a route. A `required` step has no Skip button, and
	 * `freeText: false` hides the card's "Something else" row, so the user must pick a route.
	 */
	intent: InstanceAiQuestion;
	build: {
		/** Assistant text above the build card. */
		lead: string;
		question: InstanceAiQuestion;
		/** Posted when the user picks the AI option; the task the user types next starts the first turn. */
		aiFollowUp: string;
		/** Posted when the user picks the canvas option; the client then opens a blank canvas. */
		canvasMessage: string;
	};
	idea: {
		/** Assistant text above the idea card. */
		lead: string;
		/**
		 * Steps of the idea card. The host skips a step the signup survey already answered; that
		 * answer still reaches the agent. The answer starts the first turn.
		 */
		questions: InstanceAiQuestion[];
	};
}

/** The intent card option titles, by the route each one picks. */
export const INTENT_OPTIONS = {
	build: 'I know what I want to build',
	idea: 'Recommend me something',
} as const;

/** The build card option titles, by the route each one picks. */
export const BUILD_OPTIONS = {
	ai: 'Describe it, and AI builds it',
	canvas: "I'll build it myself",
} as const;

/**
 * An option the card shows as a title with a description under it. The card sends the whole
 * string back as the answer, so the host matches a pick by its first line.
 */
function withDescription(title: string, description: string): string {
	return `${title}\n${description}`;
}

// biome-ignore format: one app list per line reads as the table it is
export const ONBOARDING_OPENING: OnboardingOpening = {
	title: 'Welcome to n8n',
	greeting: [
		"Hi {{firstName}}, I'm your Assistant.",
		'Think of me as your n8n expert.',
		"Let's find the best way for you to start.",
	].join('\n\n'),
	intent: {
		id: 'intent',
		question: 'What do you want to do first?',
		type: 'single',
		required: true,
		freeText: false,
		options: [
			withDescription(INTENT_OPTIONS.build, 'Go straight to building'),
			withDescription(INTENT_OPTIONS.idea, 'Ideas that fit your work, in a few clicks'),
		],
	},
	build: {
		lead: "Great, let's build it.",
		question: {
			id: 'build',
			question: 'How do you want to build it?',
			type: 'single',
			required: true,
			freeText: false,
			options: [
				withDescription(BUILD_OPTIONS.ai, 'The fastest way to a working workflow'),
				withDescription(BUILD_OPTIONS.canvas, 'Full control, node by node'),
			],
		},
		aiFollowUp: "Describe what you want to build, and I'll build it for you.",
		canvasMessage: 'Opening a blank canvas for you. Come back here any time you want help.',
	},
	idea: {
		lead: 'Great! A few quick questions, so I can suggest automations that fit you.',
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
			// ponytail: one list for every team; move it to `optionsByAnswer` when the copy per team exists.
			{
				id: 'goal',
				question: 'What do you want to automate first?',
				type: 'single',
				required: true,
				options: [
					'Save time on repetitive work',
					'Keep data in sync between my apps',
					'Get notified about important events',
					'Create reports automatically',
					'Reply to people faster',
				],
			},
		],
	},
};
