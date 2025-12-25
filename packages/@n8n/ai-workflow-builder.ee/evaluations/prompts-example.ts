/**
 * Example prompts for categorization evaluation
 *
 * Use this format to create custom prompt sets for evaluation.
 * You can export prompts from JSONL files using scripts/extract-user-prompts.js
 * and use them directly.
 *
 * To run with custom prompts:
 * 1. Create a file with an array of prompt strings
 * 2. Import and pass to runCategorizationEvaluation()
 */
export const examplePrompts = [
	'Create a workflow that monitors my website every 5 minutes and sends me a Slack notification if it goes down',
	'Build a chatbot that can answer customer questions about our product catalog using information from our knowledge base',
	'Set up a form to collect user feedback, analyze sentiment with AI, and store the results in Airtable',
	'Extract data from PDF invoices uploaded via form and update our accounting spreadsheet',
	'Scrape competitor pricing daily and generate a weekly summary report with price changes',
];

/**
 * Example usage:
 *
 * import { runCategorizationEvaluation } from './categorize-prompt-evaluation';
 * import { examplePrompts } from './prompts-example';
 *
 * runCategorizationEvaluation(examplePrompts).catch(console.error);
 */
