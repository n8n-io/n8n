import type { PromptConfig } from './types';

export const SYNTHETIC_PROMPTS: PromptConfig[] = [
	// ---------------------------------------------------------------------------
	// Simple (~6 prompts, quick single-tool tasks)
	// ---------------------------------------------------------------------------
	{
		text: 'List all my workflows',
		complexity: 'simple',
		source: 'synthetic',
		tags: ['query'],
		dataset: 'general',
	},
	{
		text: "Create a simple webhook workflow that returns 'Hello World' when called",
		complexity: 'simple',
		source: 'synthetic',
		tags: ['build', 'webhook'],
		dataset: 'builder',
	},
	{
		text: 'Show me the last 5 failed executions',
		complexity: 'simple',
		source: 'synthetic',
		tags: ['query'],
		dataset: 'general',
	},
	{
		text: "Create a data table called 'contacts' with columns: name, email, phone",
		complexity: 'simple',
		source: 'synthetic',
		tags: ['data-table'],
		dataset: 'general',
	},
	{
		text: 'What node types are available for sending emails?',
		complexity: 'simple',
		source: 'synthetic',
		tags: ['query', 'nodes'],
		dataset: 'general',
	},
	{
		text: "Create a manual trigger workflow with a Set node that outputs { greeting: 'hello' }",
		complexity: 'simple',
		source: 'synthetic',
		tags: ['build'],
		dataset: 'builder',
	},

	// ---------------------------------------------------------------------------
	// Medium (~8 prompts, workflow building + execution)
	// ---------------------------------------------------------------------------
	{
		text: 'Build a workflow that receives POST data at /contacts, validates the email field exists, and stores valid contacts in a data table',
		complexity: 'medium',
		source: 'synthetic',
		tags: ['build', 'webhook', 'data-table', 'validation'],
		dataset: 'builder',
	},
	{
		text: "Create a cron workflow that runs every hour and logs a timestamp to a data table called 'heartbeats'",
		complexity: 'medium',
		source: 'synthetic',
		tags: ['build', 'cron', 'data-table'],
		dataset: 'builder',
	},
	{
		text: "Build a webhook workflow that accepts JSON with a 'text' field and returns the text converted to uppercase",
		complexity: 'medium',
		source: 'synthetic',
		tags: ['build', 'webhook', 'transform'],
		dataset: 'builder',
	},
	{
		text: 'Create a workflow with a form trigger that collects name and email, then stores submissions in a data table',
		complexity: 'medium',
		source: 'synthetic',
		tags: ['build', 'form', 'data-table'],
		dataset: 'builder',
	},
	{
		text: "Build a webhook workflow with an IF node that routes requests to different response nodes based on a 'type' field in the body",
		complexity: 'medium',
		source: 'synthetic',
		tags: ['build', 'webhook', 'branching'],
		dataset: 'builder',
	},
	{
		text: "Create a workflow that fetches data from a data table, filters rows where status is 'active', and returns them via webhook response",
		complexity: 'medium',
		source: 'synthetic',
		tags: ['build', 'webhook', 'data-table', 'filter'],
		dataset: 'builder',
	},
	{
		text: 'Build a workflow with a manual trigger that uses a Code node to generate 5 sample items and stores them in a data table',
		complexity: 'medium',
		source: 'synthetic',
		tags: ['build', 'code', 'data-table'],
		dataset: 'builder',
	},
	{
		text: "Create a webhook API endpoint that accepts a search query parameter and returns matching rows from a 'products' data table",
		complexity: 'medium',
		source: 'synthetic',
		tags: ['build', 'webhook', 'data-table', 'query'],
		dataset: 'builder',
	},

	// ---------------------------------------------------------------------------
	// Medium — credential-based (external service nodes)
	// ---------------------------------------------------------------------------
	{
		text: 'Build a workflow with a manual trigger that sends a message to a Slack channel called #general saying "Hello from n8n"',
		complexity: 'medium',
		source: 'synthetic',
		tags: ['build', 'slack'],
		dataset: 'builder',
		requiredCredentials: ['slackApi'],
	},
	{
		text: 'Create a workflow that fetches all pages from a Notion database and stores the titles in a data table',
		complexity: 'medium',
		source: 'synthetic',
		tags: ['build', 'notion', 'data-table'],
		dataset: 'builder',
		requiredCredentials: ['notionApi'],
	},
	{
		text: 'Build a workflow with a manual trigger that creates a new GitHub issue in a repository with title "Test Issue" and body "Created by n8n"',
		complexity: 'medium',
		source: 'synthetic',
		tags: ['build', 'github'],
		dataset: 'builder',
		requiredCredentials: ['githubApi'],
	},

	// ---------------------------------------------------------------------------
	// Complex (~6 prompts, multi-step autonomous tasks)
	// ---------------------------------------------------------------------------
	{
		text: "Build a lead scoring system: create a data table called 'leads' with columns name, email, company, score. Build a webhook workflow that receives lead data, calculates a score based on whether company and email are provided, and stores the result. Execute the workflow with test data to verify it works.",
		complexity: 'complex',
		source: 'synthetic',
		tags: ['build', 'data-table', 'webhook', 'execution'],
		dataset: 'builder',
	},
	{
		text: "Set up a feedback collection system: create a 'feedback' data table with columns user, rating, comment, created_at. Build a form-based workflow that collects feedback and stores it. Then build a second webhook workflow that returns average ratings from the data table.",
		complexity: 'complex',
		source: 'synthetic',
		tags: ['build', 'data-table', 'form', 'multi-workflow'],
		dataset: 'builder',
	},
	{
		text: "Create an event registration workflow: make a 'registrations' data table with name, email, event, registered_at columns. Build a webhook workflow at /register that validates required fields (name, email, event), checks for duplicate emails in the data table, and only stores new registrations.",
		complexity: 'complex',
		source: 'synthetic',
		tags: ['build', 'data-table', 'webhook', 'validation', 'dedup'],
		dataset: 'builder',
	},
	{
		text: "Build a task management API: create a 'tasks' data table with title, description, status, priority columns. Build three webhook endpoints: POST /tasks to create tasks, GET /tasks to list all tasks, and a workflow that queries tasks by status.",
		complexity: 'complex',
		source: 'synthetic',
		tags: ['build', 'data-table', 'webhook', 'multi-workflow', 'crud'],
		dataset: 'builder',
	},
	{
		text: "Create a content moderation pipeline: build a webhook workflow that receives text content, uses a Code node to check for banned words (define a list of 5 banned words), flags inappropriate content by adding a 'flagged' field, and stores all submissions in a 'content_reviews' data table.",
		complexity: 'complex',
		source: 'synthetic',
		tags: ['build', 'webhook', 'code', 'data-table', 'moderation'],
		dataset: 'builder',
	},
	{
		text: "Set up an inventory tracker: create an 'inventory' data table with item_name, quantity, min_stock, last_updated columns. Seed it with 3 sample items. Build a webhook workflow that receives stock updates (item_name, quantity_change) and updates the inventory. Execute it with test data to verify.",
		complexity: 'complex',
		source: 'synthetic',
		tags: ['build', 'data-table', 'webhook', 'execution', 'seed'],
		dataset: 'builder',
	},
];
