// Experiment cleanup (129_aia_inspiration_from_taxonomy_v2)
import type { PersonalizedPromptDisplaySuggestion } from '@/experiments/instanceAiPersonalizedPromptSuggestions/types';

export type TaxonomyRole = 'sales-and-marketing';

export type TaxonomySuggestionSection = 'role' | 'everyone';

export type TaxonomyPromptSuggestion = PersonalizedPromptDisplaySuggestion & {
	taxonomyRole: TaxonomyRole;
	section: TaxonomySuggestionSection;
	order: number;
};

export const INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_VERSION = 'v6-taxonomy';
export const INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_BIS_VERSION = 'v6-taxonomy-bis';

export const TAXONOMY_SEE_MORE_ENABLED = false;

export const INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS = [
	{
		id: 'v6-taxonomy-sales-and-marketing-1-weekly-ads-and-website-report',
		taxonomyRole: 'sales-and-marketing',
		section: 'role',
		order: 1,
		shortTitle: 'Weekly report on my ads and website, with what changed',
		description: 'A Monday summary of spend, leads, and what moved versus last week.',
		builderPrompt:
			"Build a workflow that sends me a weekly marketing performance report. Every Monday at 9:00, pull last week's results from my ad and analytics accounts (for example Google Ads, Meta Ads, Google Search Console or Google Analytics) and compare them with the previous week. Use AI to write a short summary covering spend, leads, cost per lead, and what went up or down. Email it to me with Gmail and also save the numbers to a Google Sheet. Before building, ask me which platforms to include.",
	},
	{
		id: 'v6-taxonomy-sales-and-marketing-2-keep-crm-updated',
		taxonomyRole: 'sales-and-marketing',
		section: 'role',
		order: 2,
		shortTitle: 'Keep my CRM updated without manual entry',
		description: 'Creates or updates the matching CRM record when something changes elsewhere.',
		builderPrompt:
			"Build a workflow that keeps my CRM up to date automatically. When something changes in my other tools, such as a new contact in a spreadsheet, a new email from a client, a booked meeting or a paid invoice, find the matching contact or deal in my CRM, create it if it doesn't exist, and update the right fields without creating duplicates. Add a short note to the record describing what happened. Notify me on Slack or by email if a record can't be matched. Before building, ask me which CRM I use and which tools it should sync with.",
	},
	{
		id: 'v6-taxonomy-sales-and-marketing-3-qualify-leads-and-book-calls',
		taxonomyRole: 'sales-and-marketing',
		section: 'role',
		order: 3,
		shortTitle: 'AI chatbot that answers messages, qualifies leads and books calls',
		description: 'Answers messages, asks qualifying questions, and saves the lead.',
		builderPrompt:
			'Build an AI chatbot that answers people who message me on WhatsApp or my website chat and turns them into qualified leads. It should answer basic questions about my business using information I provide, ask a few qualifying questions (what they need, budget and timeline), collect their name and email or phone, and offer a link to book a call. Save each lead to a Google Sheet or my CRM and notify me on Slack, Telegram or by email. Before building, ask me which channel to use, what my business offers and which questions qualify a lead.',
	},
	{
		id: 'v6-taxonomy-sales-and-marketing-4-schedule-linkedin-posts',
		taxonomyRole: 'sales-and-marketing',
		section: 'role',
		order: 4,
		shortTitle: 'Schedule LinkedIn posts in my voice, after my approval',
		description: 'Drafts a weekday post and publishes it only after you approve.',
		builderPrompt:
			'Build a workflow that drafts and schedules social media posts for me. Every weekday morning, take the next topic, article or idea from my content list (for example a Google Sheet, Notion or Airtable) and use AI to write a post in my brand voice for LinkedIn. Send it to me on Slack or Telegram for approval. When I approve it, publish or schedule it and mark the item as posted in my content list. Before building, ask me which content source, social platforms and brand voice to use.',
	},
	{
		id: 'v6-taxonomy-sales-and-marketing-5-morning-news-brief',
		taxonomyRole: 'sales-and-marketing',
		section: 'everyone',
		order: 5,
		shortTitle: 'Morning brief from Slack, Gmail and the news',
		description: 'A daily 8:00 summary of the sources and topics you follow.',
		builderPrompt:
			'Build a workflow that sends me a daily brief every morning at 8:00. Collect the latest items from the sources I choose (for example news sites or RSS feeds, newsletters in my inbox, industry blogs, or Slack channels). Use AI to pick the most important items, summarize each in one or two sentences with a link, and group them by topic. Send the brief to me by email, Slack or Telegram. Before building, ask me which topics and sources to follow and where to send the brief.',
	},
	{
		id: 'v6-taxonomy-sales-and-marketing-6-invoices-from-email',
		taxonomyRole: 'sales-and-marketing',
		section: 'everyone',
		order: 6,
		shortTitle: 'Pull invoices from my email into a sheet, with due reminders',
		description: 'Extracts invoice details from email and reminds you before they are due.',
		builderPrompt:
			'Build a workflow that collects invoices and receipts from my email automatically. When a new email arrives with an invoice or receipt attached, use AI to extract the vendor, invoice number, date, amount, currency and due date. Save the file to a Google Drive folder named by month and add a row with the details to a Google Sheet. Send me a reminder by email or Slack when an invoice is due within 3 days. Before building, ask me which email account to watch, where to save files and which spreadsheet to use.',
	},
] as const satisfies readonly TaxonomyPromptSuggestion[];

export const INSTANCE_AI_TAXONOMY_PROMPT_SUGGESTIONS_BIS = [
	{
		id: 'v6-taxonomy-bis-sales-and-marketing-1-personal-follow-ups',
		taxonomyRole: 'sales-and-marketing',
		section: 'role',
		order: 1,
		shortTitle: "Send personal follow-ups to leads who haven't replied",
		description: 'Writes a short follow-up for quiet leads and stops when they reply.',
		builderPrompt:
			"Build a workflow that sends personalized follow-up emails to my leads. Every weekday, check my lead list (a Google Sheet or my CRM) for leads I haven't contacted yet or who haven't replied in 3 days. For each one, use AI to write a short, personal email based on what I know about them (company, role, earlier messages), then send it from Gmail or save it as a draft for me to review. Update the lead's status and last-contact date in my list, stop when someone replies, and send at most 3 follow-ups per lead. Before building, ask me where my leads are stored and whether emails should be sent automatically or saved as drafts.",
	},
	{
		id: 'v6-taxonomy-bis-sales-and-marketing-2-form-leads-to-sheet',
		taxonomyRole: 'sales-and-marketing',
		section: 'role',
		order: 2,
		shortTitle: 'Save form leads to a Google Sheet, email them and alert me',
		description: 'Stores a new form lead, confirms by email, and alerts you.',
		builderPrompt:
			"Build a workflow that handles new leads from my website form. Trigger it with a webhook or my form tool's trigger. Clean up the fields (name, email, phone, company, message) and add the lead as a new row in a Google Sheet, skipping duplicates. Send the lead a short, friendly confirmation email from Gmail, and send me an instant alert on Slack, Telegram or by email with the lead's details. Before building, ask me which form tool I use and where to send alerts.",
	},
	{
		id: 'v6-taxonomy-bis-sales-and-marketing-3-research-ideal-customers',
		taxonomyRole: 'sales-and-marketing',
		section: 'role',
		order: 3,
		shortTitle: 'Find and research leads that fit my ideal customer',
		description: 'Finds matching businesses and writes why they might need your product.',
		builderPrompt:
			'Build a workflow that finds new leads and researches them for me. Search a source I choose (for example Google Maps for local businesses, Apollo, or a list of company websites) for businesses that match my target customer. For each one, collect the name, website, location and contact details, then use AI to read their website and write a short summary of what they do and why they might need my product. Save everything to a Google Sheet, skipping leads I already have. Before building, ask me who my target customer is and which source to use.',
	},
	{
		id: 'v6-taxonomy-bis-sales-and-marketing-4-draft-seo-content',
		taxonomyRole: 'sales-and-marketing',
		section: 'role',
		order: 4,
		shortTitle: 'Draft SEO blog posts and newsletters for my review',
		description: 'Writes a blog post and a newsletter draft from the next topic.',
		builderPrompt:
			'Build a workflow that writes content for me. Each week, take the next topic or keyword from my content list (for example a Google Sheet or Notion). Use AI to research the topic and write an SEO-friendly blog post with a title, meta description, headings and a call to action, plus a short newsletter version, all in my brand voice. Save both as drafts in Google Docs, update the status in my content list, and send me the links for review. Before building, ask me where my topics live, who my audience is and how to describe my brand voice.',
	},
	{
		id: 'v6-taxonomy-bis-sales-and-marketing-5-meeting-summaries',
		taxonomyRole: 'sales-and-marketing',
		section: 'everyone',
		order: 5,
		shortTitle: 'Meeting summaries and action items, sent to me',
		description: 'Summarizes a finished meeting and lists the action items.',
		builderPrompt:
			'Build a workflow that summarizes my meetings automatically. When a meeting ends and its recording or transcript is available (for example from Google Meet, Zoom, Fireflies or Fathom), use AI to write a short summary with the key decisions, action items with owners, and any follow-up dates. Send the summary to me by email or Slack and save it to a Google Doc or Notion page. Before building, ask me which meeting tool I use and where summaries should go.',
	},
	{
		id: 'v6-taxonomy-bis-sales-and-marketing-6-messages-into-tasks',
		taxonomyRole: 'sales-and-marketing',
		section: 'everyone',
		order: 6,
		shortTitle: 'Turn requests in emails and messages into tasks',
		description: 'Creates a task from a request and sends a daily due summary.',
		builderPrompt:
			'Build a workflow that creates tasks for me automatically. When I get an email, Slack message or form submission that contains a request or action item, use AI to decide whether it needs a task. If it does, create the task in my task or project tool with a clear title, a short description, a due date if one is mentioned, and a link back to the original message. Send me a daily summary of tasks that are due or overdue. Before building, ask me which apps to watch and which task tool I use (for example Asana, Trello, ClickUp, Notion or Todoist).',
	},
] as const satisfies readonly TaxonomyPromptSuggestion[];
