// ---------------------------------------------------------------------------
// Evaluation prompts
//
// Ported from synthetic-prompts.ts, adapted to the PromptConfig interface.
// Each prompt has a complexity level, tags, and optional trigger/credential info.
// ---------------------------------------------------------------------------

import type { PromptConfig } from '../types';

export const PROMPTS: PromptConfig[] = [
	// ---------------------------------------------------------------------------
	// Simple (~6 prompts, quick single-tool tasks)
	// ---------------------------------------------------------------------------
	{
		text: 'List all my workflows',
		complexity: 'simple',
		tags: ['query'],
		dataset: 'general',
	},
	{
		text: "Create a simple webhook workflow that returns 'Hello World' when called",
		complexity: 'simple',
		tags: ['build', 'webhook'],
		triggerType: 'webhook',
		dataset: 'builder',
	},
	{
		text: 'Show me the last 5 failed executions',
		complexity: 'simple',
		tags: ['query'],
		dataset: 'general',
	},
	{
		text: "Create a data table called 'contacts' with columns: name, email, phone",
		complexity: 'simple',
		tags: ['data-table'],
		dataset: 'general',
	},
	{
		text: 'What node types are available for sending emails?',
		complexity: 'simple',
		tags: ['query', 'nodes'],
		dataset: 'general',
	},
	{
		text: "Create a manual trigger workflow with a Set node that outputs { greeting: 'hello' }",
		complexity: 'simple',
		tags: ['build'],
		triggerType: 'manual',
		dataset: 'builder',
	},

	// ---------------------------------------------------------------------------
	// Medium (~8 prompts, workflow building + execution)
	// ---------------------------------------------------------------------------
	{
		text: 'Build a workflow that receives POST data at /contacts, validates the email field exists, and stores valid contacts in a data table',
		complexity: 'medium',
		tags: ['build', 'webhook', 'data-table', 'validation'],
		triggerType: 'webhook',
		dataset: 'builder',
	},
	{
		text: "Create a cron workflow that runs every hour and logs a timestamp to a data table called 'heartbeats'",
		complexity: 'medium',
		tags: ['build', 'cron', 'data-table'],
		triggerType: 'schedule',
		dataset: 'builder',
	},
	{
		text: "Build a webhook workflow that accepts JSON with a 'text' field and returns the text converted to uppercase",
		complexity: 'medium',
		tags: ['build', 'webhook', 'transform'],
		triggerType: 'webhook',
		dataset: 'builder',
	},
	{
		text: 'Create a workflow with a form trigger that collects name and email, then stores submissions in a data table',
		complexity: 'medium',
		tags: ['build', 'form', 'data-table'],
		triggerType: 'form',
		dataset: 'builder',
	},
	{
		text: "Build a webhook workflow with an IF node that routes requests to different response nodes based on a 'type' field in the body",
		complexity: 'medium',
		tags: ['build', 'webhook', 'branching'],
		triggerType: 'webhook',
		dataset: 'builder',
	},
	{
		text: "Create a workflow that fetches data from a data table, filters rows where status is 'active', and returns them via webhook response",
		complexity: 'medium',
		tags: ['build', 'webhook', 'data-table', 'filter'],
		triggerType: 'webhook',
		dataset: 'builder',
	},
	{
		text: 'Build a workflow with a manual trigger that uses a Code node to generate 5 sample items and stores them in a data table',
		complexity: 'medium',
		tags: ['build', 'code', 'data-table'],
		triggerType: 'manual',
		dataset: 'builder',
	},
	{
		text: "Create a webhook API endpoint that accepts a search query parameter and returns matching rows from a 'products' data table",
		complexity: 'medium',
		tags: ['build', 'webhook', 'data-table', 'query'],
		triggerType: 'webhook',
		dataset: 'builder',
	},

	// ---------------------------------------------------------------------------
	// Medium -- credential-based (external service nodes)
	// ---------------------------------------------------------------------------
	{
		text: 'Build a workflow with a manual trigger that sends a message to a Slack channel called #general saying "Hello from n8n"',
		complexity: 'medium',
		tags: ['build', 'slack'],
		triggerType: 'manual',
		expectedCredentials: ['slackApi'],
		dataset: 'builder',
	},
	{
		text: 'Create a workflow that fetches all pages from a Notion database and stores the titles in a data table',
		complexity: 'medium',
		tags: ['build', 'notion', 'data-table'],
		triggerType: 'manual',
		expectedCredentials: ['notionApi'],
		dataset: 'builder',
	},
	{
		text: 'Build a workflow with a manual trigger that creates a new GitHub issue in a repository with title "Test Issue" and body "Created by n8n"',
		complexity: 'medium',
		tags: ['build', 'github'],
		triggerType: 'manual',
		expectedCredentials: ['githubApi'],
		dataset: 'builder',
	},
	{
		text: 'Build a workflow with a manual trigger that sends an email via Gmail to test@example.com with subject "Test from n8n" and body "Hello, this is an automated test"',
		complexity: 'medium',
		tags: ['build', 'gmail', 'email'],
		triggerType: 'manual',
		expectedCredentials: ['gmailOAuth2Api'],
		dataset: 'builder',
	},
	{
		text: 'Create a workflow with a manual trigger that sends a message to a Microsoft Teams channel saying "Status update from n8n"',
		complexity: 'medium',
		tags: ['build', 'teams', 'microsoft'],
		triggerType: 'manual',
		expectedCredentials: ['microsoftTeamsOAuth2Api'],
		dataset: 'builder',
	},
	{
		text: 'Build a workflow with a manual trigger that makes an HTTP request to https://jsonplaceholder.typicode.com/posts using HTTP Header Auth credentials and stores the response in a data table',
		complexity: 'medium',
		tags: ['build', 'http', 'data-table'],
		triggerType: 'manual',
		expectedCredentials: ['httpHeaderAuth'],
		dataset: 'builder',
	},
	{
		text: 'Create a workflow with a manual trigger that fetches data from https://httpbin.org/get using HTTP Basic Auth credentials and returns the response',
		complexity: 'medium',
		tags: ['build', 'http', 'auth'],
		triggerType: 'manual',
		expectedCredentials: ['httpBasicAuth'],
		dataset: 'builder',
	},

	// ---------------------------------------------------------------------------
	// Complex (~6 prompts, multi-step autonomous tasks)
	// ---------------------------------------------------------------------------
	{
		text: "Build a lead scoring system: create a data table called 'leads' with columns name, email, company, score. Build a webhook workflow that receives lead data, calculates a score based on whether company and email are provided, and stores the result. Execute the workflow with test data to verify it works.",
		complexity: 'complex',
		tags: ['build', 'data-table', 'webhook', 'execution'],
		triggerType: 'webhook',
		dataset: 'builder',
	},
	{
		text: "Set up a feedback collection system: create a 'feedback' data table with columns user, rating, comment, created_at. Build a form-based workflow that collects feedback and stores it. Then build a second webhook workflow that returns average ratings from the data table.",
		complexity: 'complex',
		tags: ['build', 'data-table', 'form', 'multi-workflow'],
		triggerType: 'form',
		dataset: 'builder',
	},
	{
		text: "Create an event registration workflow: make a 'registrations' data table with name, email, event, registered_at columns. Build a webhook workflow at /register that validates required fields (name, email, event), checks for duplicate emails in the data table, and only stores new registrations.",
		complexity: 'complex',
		tags: ['build', 'data-table', 'webhook', 'validation', 'dedup'],
		triggerType: 'webhook',
		dataset: 'builder',
	},
	{
		text: "Build a task management API: create a 'tasks' data table with title, description, status, priority columns. Build three webhook endpoints: POST /tasks to create tasks, GET /tasks to list all tasks, and a workflow that queries tasks by status.",
		complexity: 'complex',
		tags: ['build', 'data-table', 'webhook', 'multi-workflow', 'crud'],
		triggerType: 'webhook',
		dataset: 'builder',
	},
	{
		text: "Create a content moderation pipeline: build a webhook workflow that receives text content, uses a Code node to check for banned words (define a list of 5 banned words), flags inappropriate content by adding a 'flagged' field, and stores all submissions in a 'content_reviews' data table.",
		complexity: 'complex',
		tags: ['build', 'webhook', 'code', 'data-table', 'moderation'],
		triggerType: 'webhook',
		dataset: 'builder',
	},
	{
		text: "Set up an inventory tracker: create an 'inventory' data table with item_name, quantity, min_stock, last_updated columns. Seed it with 3 sample items. Build a webhook workflow that receives stock updates (item_name, quantity_change) and updates the inventory. Execute it with test data to verify.",
		complexity: 'complex',
		tags: ['build', 'data-table', 'webhook', 'execution', 'seed'],
		triggerType: 'webhook',
		dataset: 'builder',
	},
];
