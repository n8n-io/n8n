import type { PromptConfig } from './types';

export const SYNTHETIC_PROMPTS: PromptConfig[] = [
	// Simple prompts (linear flows, 1-4 nodes)
	{
		text: 'Create a workflow that receives an HTTP POST webhook at /contacts, validates the email field is present, and returns a success response with the contact ID.',
		complexity: 'simple',
		source: 'synthetic',
		tags: ['webhook', 'validation'],
	},
	{
		text: 'Create a workflow triggered by a cron schedule every day at 9am that fetches a list of users from an API endpoint and logs the count.',
		complexity: 'simple',
		source: 'synthetic',
		tags: ['cron', 'api'],
	},
	{
		text: 'Create a workflow with an HTTP GET endpoint at /health that checks a database connection status and returns either "healthy" or "unhealthy" with the current timestamp.',
		complexity: 'simple',
		source: 'synthetic',
		tags: ['api'],
	},
	{
		text: 'Create a workflow that receives a POST webhook at /transform with a JSON body containing a "text" field, converts it to uppercase, counts the words, and returns both the transformed text and word count.',
		complexity: 'simple',
		source: 'synthetic',
		tags: ['webhook'],
	},

	// Medium prompts (branches, conditionals, 5-10 nodes)
	{
		text: 'Create a workflow that receives an HTTP POST at /orders with order data. Route the order based on its type: "subscription" orders go through a recurring billing setup, "one-time" orders go through direct payment processing, and "trial" orders skip payment and create a trial account. Each path returns a different confirmation message.',
		complexity: 'medium',
		source: 'synthetic',
		tags: ['webhook', 'routing'],
	},
	{
		text: 'Create a workflow triggered by a POST webhook at /support-tickets. Classify the ticket priority as "critical", "high", "medium", or "low" based on the severity field. Critical tickets send an immediate alert and escalate to a manager. High tickets assign to senior support. Medium and low tickets go to the general queue. All tickets get a confirmation email sent.',
		complexity: 'medium',
		source: 'synthetic',
		tags: ['webhook', 'routing', 'notification'],
	},
	{
		text: 'Create a workflow with an HTTP POST endpoint at /leads that receives lead data. First validate the required fields (name, email, company). If validation fails, return an error. If valid, check if the lead already exists by email. Existing leads get updated, new leads get created. Both paths then trigger a notification to the sales team with the lead details.',
		complexity: 'medium',
		source: 'synthetic',
		tags: ['webhook', 'validation'],
	},
	{
		text: 'Create a workflow with a cron trigger every hour that fetches pending invoices. For each invoice, check if it is overdue. Overdue invoices get a reminder email sent and their status updated to "reminded". Non-overdue invoices within 3 days of due date get a courtesy reminder. All others are skipped. Return a summary of actions taken.',
		complexity: 'medium',
		source: 'synthetic',
		tags: ['cron', 'loop', 'notification'],
	},

	// Complex prompts (waits, loops, merges, parallel paths)
	{
		text: 'Create a workflow that receives an HTTP POST at /onboarding with new employee data. First, create accounts in parallel: email account, Slack workspace, and project management tool. After all three accounts are created, send a welcome email with all the account details. Then set a 7-day timer wait. After the wait, send a follow-up survey to check how onboarding went.',
		complexity: 'complex',
		source: 'synthetic',
		tags: ['webhook', 'parallel', 'wait'],
	},
	{
		text: 'Create a workflow triggered by POST at /approval-request that handles a multi-stage approval process. First, validate the request data. Then send an approval request to the first approver and wait for their webhook response. If approved, send to a second approver and wait again. If the second approver also approves, execute the approved action and notify the requester. If either approver rejects, notify the requester of the rejection with the reason. Track the full approval chain.',
		complexity: 'complex',
		source: 'synthetic',
		tags: ['webhook', 'approval', 'wait'],
	},
	{
		text: 'Create a workflow with a POST endpoint at /batch-import that receives an array of product items. Loop through each item and for each one: validate the data format, check for duplicates, transform prices to the correct currency, and categorize the product. Items that fail validation go to an error collection. Valid items are inserted into the database. After all items are processed, generate a summary report with counts of successful imports, duplicates found, and validation errors.',
		complexity: 'complex',
		source: 'synthetic',
		tags: ['webhook', 'loop', 'batch'],
	},
	{
		text: 'Create a workflow triggered by a cron every Monday at 8am and also by an HTTP POST at /reports/generate. The workflow gathers data from three sources in parallel: sales metrics, customer feedback scores, and support ticket statistics. After all data is collected, merge the results and generate a formatted report. Then branch based on a threshold: if the overall score is above 80, send a congratulations message to the team channel. If between 60-80, send a regular update. If below 60, escalate to management with action items. Finally, archive the report data.',
		complexity: 'complex',
		source: 'synthetic',
		tags: ['cron', 'webhook', 'parallel', 'routing'],
	},

	// Agent prompts (AI agent with tools)
	{
		text: 'Create an AI agent that translates text between languages. It should have a single "translate-text" tool that accepts a text string, source language, and target language, and returns the translated text. The agent should be instructed to help users with translations and use the translation tool when asked.',
		complexity: 'simple',
		source: 'synthetic',
		tags: ['agent'],
	},
	{
		text: 'Create a nutrition AI assistant agent that helps users track their meals. It should have three tools: (1) an "analyze-food" tool that takes a food description and returns nutritional data including calories, protein, carbs, and fat, (2) a "log-meal" tool that records a meal entry with the food name, nutritional values, and meal type (breakfast/lunch/dinner/snack), and (3) a "get-daily-report" tool that takes a date string and returns a daily nutrition summary with total calories, protein, carbs, fat, and meal count. The agent should be instructed to analyze food when users describe what they ate, log meals after analysis, and provide daily reports when asked.',
		complexity: 'medium',
		source: 'synthetic',
		tags: ['agent'],
	},
	{
		text: 'Create a project management AI assistant agent with five tools: (1) "create-task" that takes a title, description, priority (high/medium/low), and assignee, and returns a task ID, (2) "list-tasks" that takes a project ID and optional status filter (open/in-progress/done) and returns an array of tasks, (3) "update-task-status" that takes a task ID and new status and returns the updated task, (4) "add-comment" that takes a task ID and comment text and returns a comment ID, and (5) "get-project-summary" that takes a project ID and returns statistics including total tasks, tasks by status, and overdue count. The agent should be instructed to help users manage their project tasks, create and update tasks, and provide project overviews when requested.',
		complexity: 'complex',
		source: 'synthetic',
		tags: ['agent'],
	},

	// Community workflow prompts (sourced from n8n community workflows + synthetic ultra-complex)
	{
		text: "Create an AI personal assistant workflow triggered by Telegram messages that handles both text and voice inputs. When a voice message arrives, transcribe it to text using OpenAI before processing. The AI agent should have tools for: (1) fetching events from Google Calendar with configurable time range, (2) fetching unread emails from Gmail with date filters, (3) sending emails via Gmail with recipient, subject, and HTML message body, (4) creating tasks in Google Tasks with a title, and (5) getting all tasks from Google Tasks. The agent should be instructed that for email summarization it must include the sender, message date, subject, and a brief summary. For calendar queries, it should filter out events more than one week away and default to today if no date is specified. The agent should use window buffer memory keyed by the sender's ID. The response should be sent back via Telegram with Markdown formatting.",
		complexity: 'complex',
		source: 'synthetic',
		tags: ['community', 'agent'],
	},
	{
		text: 'Create an email labelling workflow triggered by Gmail polling every 5 minutes for new emails. After receiving a new email, add a short wait delay, then pass it to an AI labelling agent. The agent should have tools for: (1) reading all existing Gmail labels, (2) getting a specific email message by ID, (3) adding a label to a message, and (4) creating a new label. The agent should be instructed to analyze each email\'s subject, sender, and content to match it to existing Gmail labels. For low-importance emails like ads and promotions, it should remove the inbox label. If no matching label exists, it should create a sub-label under an existing parent label or under an "AI" parent label. The agent should use window buffer memory keyed by message ID and be limited to 5 iterations.',
		complexity: 'medium',
		source: 'synthetic',
		tags: ['community', 'agent'],
	},
	{
		text: "Create a webhook-triggered workflow that generates personalized single-use Calendly scheduling links. The webhook POST endpoint receives the recipient's name, email, event type, and UTM source. The workflow should call the Calendly API to get the current user info, then get available event types, then create a single-use scheduling link via the Calendly scheduling_links API endpoint with recipient pre-fill parameters including name and email. After generating the link, log the details to a Google Sheets spreadsheet, send a Slack notification about the new link, and return the personalized booking URL in the webhook response.",
		complexity: 'medium',
		source: 'synthetic',
		tags: ['community', 'webhook', 'api'],
	},
	{
		text: 'Create a receipt scanning workflow triggered when a new file is created in a specific Google Drive folder. The workflow should download the file from Google Drive via an HTTP request, then extract text from the document using Mistral AI OCR. Pass the extracted markdown text to an AI agent instructed to analyze invoices. The agent should use a structured output parser that expects these specific fields: invoiceNumber, From address, To address, invoiceDate, dueDate, and shortDescription. After parsing, append a row to a Google Sheets spreadsheet containing all the parsed invoice fields plus a link to the original file in Google Drive.',
		complexity: 'medium',
		source: 'synthetic',
		tags: ['community', 'agent'],
	},
	{
		text: 'Create a multi-stage AI pipeline workflow for repurposing YouTube content into short-form clips. First, scrape the YouTube video transcript with timestamps using the Apify integration. Then run four AI processing stages: (1) A title generation step that produces three title variations \u2014 SEO-Focused, Curiosity-Driven, and Hybrid \u2014 following rules for 40-60 character length and CTR optimization with power words. (2) A thumbnail prompt generation step that transforms rough visual concepts into detailed image generation prompts specifying fonts, colors, and 16:9 aspect ratio. (3) A clip identification step that finds self-contained clips of at least 45 seconds from the transcript with benefit-driven captions and proper start/end boundaries. (4) A description generation step that creates YouTube descriptions with properly formatted chapter timestamps in MM:SS or HH:MM:SS format derived from the transcript. Store all generated outputs in Airtable for coordination.',
		complexity: 'complex',
		source: 'synthetic',
		tags: ['community', 'api'],
	},
	{
		text: 'Create a CRM lead automation workflow with two entry points: (1) an HTTP POST webhook at /leads for web form submissions, and (2) a Gmail trigger polling every 10 minutes for inbound sales emails. For the webhook path: validate required fields (name, email, company), check for duplicates by email lookup, enrich the lead using Clearbit API to get company size and industry, then score the lead \u2014 hot leads (score >80) get a Slack alert to the sales channel plus a follow-up email via Gmail, warm leads (40-80) get added to a nurture sequence with a 3-day wait timer then a follow-up email, cold leads (<40) get tagged and added to a newsletter list. For the email trigger path: classify email intent (purchase inquiry, support, partnership) using an AI classification step, route purchase inquiries to the lead scoring pipeline, support requests to Zendesk ticket creation, and partnership emails to a Slack channel. Both paths should log activities to a Google Sheets audit trail and sync lead status back to the CRM.',
		complexity: 'complex',
		source: 'synthetic',
		tags: ['community', 'webhook', 'routing'],
	},
	{
		text: 'Create a multi-agent content production workflow triggered by a webhook POST at /content-request containing a topic, target audience, and content type (blog or social). First, a Research Agent with tools for web search and knowledge base lookup gathers background information and outputs a research brief with key facts and sources. Second, a Strategy Agent with tools for SEO keyword analysis and content calendar checking produces a content plan with outline and keyword strategy. Third, route based on content type: blog posts go to a Writing Agent with tools for draft generation and readability scoring; social media goes to a Social Media Agent with tools for platform formatting (Twitter/LinkedIn) and hashtag generation that produces 3 post variations. Fourth, all paths converge to an Editorial Review Agent with tools for grammar checking and fact verification that outputs a quality score. If the score is below 85%, loop back to the writing agent with revision notes for up to 3 cycles. Fifth, approved content goes to a human approval webhook wait \u2014 send a Slack message with the content and wait for a webhook callback. If approved, publish to WordPress and archive to Google Drive. Store all outputs in Airtable.',
		complexity: 'complex',
		source: 'synthetic',
		tags: ['community', 'agent', 'routing'],
	},

	// Platform feature prompts (credentials, data tables, forms, auth, binary data, subworkflows)
	{
		text: "Create a workflow with a form trigger at /feedback that collects name, email, rating (dropdown: 1-5), and comments. Store each submission in a 'feedback' data table and return a thank-you HTML page.",
		complexity: 'simple',
		source: 'synthetic',
		tags: ['form', 'data-table', 'html'],
	},
	{
		text: "Create a workflow triggered by a cron every hour that fetches new Slack messages using Slack OAuth credentials, filters messages containing 'urgent', and posts a summary to a different Slack channel.",
		complexity: 'simple',
		source: 'synthetic',
		tags: ['credentials'],
	},
	{
		text: "Create a workflow with a GET endpoint at /status that queries a 'services' data table for system health metrics and returns an HTML dashboard page showing service name, status, and last check time in a styled table.",
		complexity: 'simple',
		source: 'synthetic',
		tags: ['data-table', 'html'],
	},
	{
		text: "Create a workflow with a POST endpoint at /api/data protected by basic auth that receives a JSON payload with name and value fields, validates both fields are present, stores the record in a 'records' data table, and returns the created record with an insertedCount.",
		complexity: 'medium',
		source: 'synthetic',
		tags: ['auth', 'data-table'],
	},
	{
		text: "Create a multi-step form workflow at /apply: Page 1 collects personal info (name, email, phone). Page 2 collects experience (years of experience as number, current role as text, skills as text). Page 3 collects preferences (desired role as dropdown with options Engineering/Design/Product/Marketing, salary range as text, start date). After all pages, store the complete application in an 'applications' data table and return a confirmation message.",
		complexity: 'medium',
		source: 'synthetic',
		tags: ['form', 'data-table'],
	},
	{
		text: "Create a workflow triggered by POST at /upload that accepts a file ID in the request body. Read the binary file data, use OpenAI credentials to call an analysis API with the file content, store the analysis results (fileName, mimeType, analysis summary) in a 'file-analyses' data table, and return the analysis as JSON.",
		complexity: 'medium',
		source: 'synthetic',
		tags: ['binary-data', 'credentials', 'data-table'],
	},
	{
		text: "Create a workflow triggered by POST at /batch-process that receives an array of customer records with id and name fields. Loop through them in batches of 5, and for each batch call an 'enrichment' subworkflow that adds company data. Collect all enriched records and return the complete list.",
		complexity: 'medium',
		source: 'synthetic',
		tags: ['batch', 'subworkflow'],
	},
	{
		text: "Create a workflow triggered by a form at /expense-report that collects employee name, amount (number), category (dropdown: travel, supplies, software, other), and description. If amount is greater than 500, request manager approval by sending a notification to manager@company.com and waiting for their decision. On approval, store in an 'approved-expenses' data table. On rejection, store in a 'rejected-expenses' data table with the rejection reason. If amount is 500 or less, auto-approve and store directly in the 'approved-expenses' data table.",
		complexity: 'complex',
		source: 'synthetic',
		tags: ['form', 'approval', 'data-table'],
	},
	{
		text: "Create a workflow suite for a contacts management app: (1) A GET endpoint at /contacts that reads all rows from a 'contacts' data table and returns an HTML page listing each contact's name, email, phone, and company in a table. (2) A GET endpoint at /contacts/new that serves an HTML page with a form containing fields for name, email, phone, and company. (3) A POST endpoint at /contacts protected by basic auth that receives the form data, validates all four fields are present, stores the contact in the 'contacts' data table, and returns a success HTML page. (4) A POST endpoint at /contacts/delete protected by basic auth that receives a contactId, deletes the matching row from the data table, and returns a confirmation.",
		complexity: 'complex',
		source: 'synthetic',
		tags: ['auth', 'data-table', 'html'],
	},
	{
		text: "Create a document processing pipeline: triggered by POST at /documents with header auth using X-API-Key. The request body contains a fileId. Read the binary file data, then call an 'ocr-extraction' subworkflow using OCR service credentials to extract text. Store the extracted text in a 'documents' data table with the fileName and pageCount. Then loop through each page of extracted text in batches of 3, running a classification step that categorizes the content. Store each classification in a 'classifications' data table with documentId, pageNumber, and category. Finally, return an HTML summary page showing the document name, total page count, and a list of page classifications.",
		complexity: 'complex',
		source: 'synthetic',
		tags: ['auth', 'binary-data', 'credentials', 'subworkflow', 'data-table', 'batch', 'html'],
	},
];
