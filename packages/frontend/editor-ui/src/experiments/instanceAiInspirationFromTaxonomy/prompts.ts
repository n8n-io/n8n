import type { PersonalizedPromptDisplaySuggestion } from '@/experiments/instanceAiPersonalizedPromptSuggestions/types';

export type TaxonomyRole = 'sales-and-marketing' | 'it';

export type TaxonomyPromptSuggestion = PersonalizedPromptDisplaySuggestion & {
	taxonomyRole: TaxonomyRole;
	order: number;
};

export const INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_VERSION = 'v5-taxonomy';

export const TAXONOMY_SEE_MORE_ENABLED = false;

export const INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS = [
	{
		id: 'v5-taxonomy-it-1-detect-and-escalate-1password-vault-exports',
		taxonomyRole: 'it',
		order: 1,
		shortTitle: 'Detect and escalate 1Password vault exports',
		description:
			'Monitor 1Password audit events for vault exports and escalates each detection to TheHive as an alert, with a notification to your Slack security channel.',
		builderPrompt:
			'Fetch recent 1Password audit events and keep only vault exports. For each export, collect the user, vault name, timestamp, and IP if available. Create a high-severity TheHive alert titled "1Password vault export detected", with the details in the description. Post a summary on Slack with a link to the TheHive alert',
	},
	{
		id: 'v5-taxonomy-it-2-escalate-entra-id-high-risk-users',
		taxonomyRole: 'it',
		order: 2,
		shortTitle: 'Escalate Entra ID high-risk users',
		description:
			'Check Microsoft Entra ID for high-risk user detections, aggregate the risk details per user, open an alert in TheHive, and notify to security channel on Slack.',
		builderPrompt:
			'Every 15 minutes, query Microsoft Graph for Entra ID risk detections and keep only high-risk users. Group detections per user and aggregate risk level, risk state, detection types, sign-in location/IP, and timestamps. Create a high-severity TheHive alert titled "Entra ID high-risk user detected: <user>", with the details in the description. Post a message on Slack with a link to the TheHive alert.',
	},
	{
		id: 'v5-taxonomy-it-3-turn-emails-into-notion-tasks',
		taxonomyRole: 'it',
		order: 3,
		shortTitle: 'Turn emails into Notion tasks',
		description: 'Extract action items from labeled emails automatically.',
		builderPrompt:
			'On a schedule, check Gmail for messages with a specific label. Extract the task and its key details from each, then create a matching task card in a Notion database.',
	},
	{
		id: 'v5-taxonomy-it-4-alert-on-unexplained-payment-failures',
		taxonomyRole: 'it',
		order: 4,
		shortTitle: 'Alert on unexplained payment failures',
		description:
			'Watch recurring payment transactions for failures with unknown causes and send an alert with the transaction for investigation.',
		builderPrompt:
			'Every hour, fetch recent failed recurring payments from my payment system. Keep only failures whose reason is unknown, missing, or uncategorized, and exclude causes such as insufficient funds or expired cards. For each one, collect the transaction ID, customer, amount, currency, timestamp, and raw error data. Alert my team in Slack.',
	},
	{
		id: 'v5-taxonomy-sales-and-marketing-1-link-attio-contacts-to-their-deals',
		taxonomyRole: 'sales-and-marketing',
		order: 1,
		shortTitle: 'Link Attio contacts to their deals',
		description: 'Keep CRM records connected without manual data entry.',
		builderPrompt:
			"On a schedule, go through my Attio contacts. Look up each contact's company and deals, then associate the contact with the right deals so my CRM records stay connected.",
	},
	{
		id: 'v5-taxonomy-sales-and-marketing-2-route-nps-feedback-to-follow-up',
		taxonomyRole: 'sales-and-marketing',
		order: 2,
		shortTitle: 'Route NPS feedback to the right follow-up',
		description:
			'Sorts incoming NPS responses: promoters get tagged in Mailchimp for follow-up campaigns, detractors trigger an Outlook alert.',
		builderPrompt:
			'When a new NPS response arrives, evaluate the score. For 9-10 (promoter), find the customer in Mailchimp by email, add them to my main audience, and add a "happy customer" tag for referral and review campaigns. For 6 or below (detractor), email customer success through Outlook with the name, email, score, and any feedback. Do nothing for 7-8.',
	},
	{
		id: 'v5-taxonomy-sales-and-marketing-3-enrich-new-hubspot-companies',
		taxonomyRole: 'sales-and-marketing',
		order: 3,
		shortTitle: 'Enrich new HubSpot companies',
		description:
			'Automatically researches every new company added to HubSpot using AI web search and fills in its profile with business model, category, and location data.',
		builderPrompt:
			"Build an automation that enriches newly created HubSpot company records with AI research. Run whenever a new company is created in HubSpot. For each new company, take its name and website domain and use an AI model with web search capability to research the business. Structured data should be returned: the company's business model (e.g. B2B SaaS, e-commerce, agency, marketplace), its industry category, a one sentence description of what it does, its headquarters location, and approximate company size if discoverable. Update the corresponding HubSpot company record's properties with this data. If the research fails or returns low-confidence results, tag the company for manual review.",
	},
	{
		id: 'v5-taxonomy-sales-and-marketing-4-ai-coaching-feedback-on-sales-calls',
		taxonomyRole: 'sales-and-marketing',
		order: 4,
		shortTitle: 'AI coaching feedback on sales calls',
		description:
			'Generate structured coaching feedback and performance scores from sales calls, then posts the results to Slack.',
		builderPrompt:
			"When a new call transcript is available, send it to an AI sales coach. Score the call 1-10 and per criterion: discovery questions, objection handling, talk-to-listen ratio, next-step commitment, and rapport. Return three strengths, three improvement areas with quotes from the call, and a suggested follow-up. Post a readable summary to Slack with the rep's name, call date, prospect/company, overall score, and coaching feedback.",
	},
] as const satisfies readonly TaxonomyPromptSuggestion[];
