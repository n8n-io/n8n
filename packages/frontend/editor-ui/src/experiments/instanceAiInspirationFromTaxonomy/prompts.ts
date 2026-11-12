// Experiment cleanup (142_aia_inspiration_from_taxonomy_v3)
import type { PersonalizedPromptDisplaySuggestion } from '@/experiments/instanceAiPersonalizedPromptSuggestions/types';

export type TaxonomyRole = 'sales-and-marketing';

export type TaxonomySuggestionSection = 'role' | 'everyone';

export type TaxonomyPromptSuggestion = PersonalizedPromptDisplaySuggestion & {
	taxonomyRole: TaxonomyRole;
	section: TaxonomySuggestionSection;
	order: number;
};

export const INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_VERSION = 'v7-taxonomy';

export const TAXONOMY_SEE_MORE_ENABLED = false;

export const INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS = [
	{
		id: 'v6-taxonomy-sales-and-marketing-3-qualify-leads-and-book-calls',
		taxonomyRole: 'sales-and-marketing',
		section: 'role',
		order: 1,
		shortTitle: 'AI chatbot that answers messages, qualifies leads and books calls',
		description: 'Answers messages, asks qualifying questions, and saves the lead.',
		builderPrompt:
			'Build an AI chatbot that answers people who message me on WhatsApp or my website chat and turns them into qualified leads. It should answer basic questions about my business using information I provide, ask a few qualifying questions (what they need, budget and timeline), collect their name and email or phone, and offer a link to book a call. Save each lead to a Google Sheet or my CRM and notify me on Slack, Telegram or by email. Before building, ask me which channel to use, what my business offers and which questions qualify a lead.',
	},
	{
		id: 'v6-taxonomy-bis-sales-and-marketing-3-research-ideal-customers',
		taxonomyRole: 'sales-and-marketing',
		section: 'role',
		order: 2,
		shortTitle: 'Find and research leads that fit my ideal customer',
		description: 'Finds matching businesses and writes why they might need your product.',
		builderPrompt:
			'Build a workflow that finds new leads and researches them for me. Search a source I choose (for example Google Maps for local businesses, Apollo, or a list of company websites) for businesses that match my target customer. For each one, collect the name, website, location and contact details, then use AI to read their website and write a short summary of what they do and why they might need my product. Save everything to a Google Sheet, skipping leads I already have. Before building, ask me who my target customer is and which source to use.',
	},
	{
		id: 'v6-taxonomy-bis-sales-and-marketing-2-form-leads-to-sheet',
		taxonomyRole: 'sales-and-marketing',
		section: 'role',
		order: 3,
		shortTitle: 'Save form leads to a Google Sheet, email them and alert me',
		description: 'Stores a new form lead, confirms by email, and alerts you.',
		builderPrompt:
			"Build a workflow that handles new leads from my website form. Trigger it with a webhook or my form tool's trigger. Clean up the fields (name, email, phone, company, message) and add the lead as a new row in a Google Sheet, skipping duplicates. Send the lead a short, friendly confirmation email from Gmail, and send me an instant alert on Slack, Telegram or by email with the lead's details. Before building, ask me which form tool I use and where to send alerts.",
	},
	{
		id: 'v6-taxonomy-sales-and-marketing-2-keep-crm-updated',
		taxonomyRole: 'sales-and-marketing',
		section: 'role',
		order: 4,
		shortTitle: 'Keep my CRM updated without manual entry',
		description: 'Creates or updates the matching CRM record when something changes elsewhere.',
		builderPrompt:
			"Build a workflow that keeps my CRM up to date automatically. When something changes in my other tools, such as a new contact in a spreadsheet, a new email from a client, a booked meeting or a paid invoice, find the matching contact or deal in my CRM, create it if it doesn't exist, and update the right fields without creating duplicates. Add a short note to the record describing what happened. Notify me on Slack or by email if a record can't be matched. Before building, ask me which CRM I use and which tools it should sync with.",
	},
	{
		id: 'v6-taxonomy-bis-sales-and-marketing-6-messages-into-tasks',
		taxonomyRole: 'sales-and-marketing',
		section: 'everyone',
		order: 5,
		shortTitle: 'Turn requests in emails and messages into tasks',
		description: 'Creates a task from a request and sends a daily due summary.',
		builderPrompt:
			'Build a workflow that creates tasks for me automatically. When I get an email, Slack message or form submission that contains a request or action item, use AI to decide whether it needs a task. If it does, create the task in my task or project tool with a clear title, a short description, a due date if one is mentioned, and a link back to the original message. Send me a daily summary of tasks that are due or overdue. Before building, ask me which apps to watch and which task tool I use (for example Asana, Trello, ClickUp, Notion or Todoist).',
	},
	{
		id: 'v6-taxonomy-bis-sales-and-marketing-5-meeting-summaries',
		taxonomyRole: 'sales-and-marketing',
		section: 'everyone',
		order: 6,
		shortTitle: 'Meeting summaries and action items, sent to me',
		description: 'Summarizes a finished meeting and lists the action items.',
		builderPrompt:
			'Build a workflow that summarizes my meetings automatically. When a meeting ends and its recording or transcript is available (for example from Google Meet, Zoom, Fireflies or Fathom), use AI to write a short summary with the key decisions, action items with owners, and any follow-up dates. Send the summary to me by email or Slack and save it to a Google Doc or Notion page. Before building, ask me which meeting tool I use and where summaries should go.',
	},
] as const satisfies readonly TaxonomyPromptSuggestion[];
