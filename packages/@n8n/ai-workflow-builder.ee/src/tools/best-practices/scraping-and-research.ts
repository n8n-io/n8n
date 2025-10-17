import type { TechniqueBestPractice } from '@/types';
import { WorkflowTechnique } from '@/types/categorization';

export const n8nScrapingBestPractices: TechniqueBestPractice = {
	version: '1.0.0',
	technique: WorkflowTechnique.SCRAPING_AND_RESEARCH,
	sections: [
		{
			name: 'Performance & Resource Management',
			guidelines: [
				{
					text: `Batch requests and introduce delays to avoid hitting API rate limits or overloading target servers.
						Use Wait nodes and batching options in HTTP Request nodes. When 429 rate limiting errors occur due to
						receiving too many requests, implement batching to reduce request frequency or use the "Retry on Fail"
						feature to automatically handle throttled responses.`,
					category: 'performance',
					priority: 'high',
				},
				{
					text: `Monitor memory usage and increase timeouts or server resources for large jobs. Workflows processing large
						datasets can crash due to memory constraints. Use the Split In Batches node to process 200 rows at a time
						to reduce memory usage, leverage built-in nodes instead of custom code, and increase execution timeouts
						via environment variables for better resource management.`,
					category: 'performance',
					priority: 'high',
				},
			],
		},
		{
			name: 'Looping & Pagination',
			guidelines: [
				{
					text: `Implement robust looping for paginated data. Use Set, IF, and Code nodes to manage page numbers and loop
						conditions, ensuring you don't miss data or create infinite loops. Leverage n8n's built-in mechanisms
						rather than manual approaches: use the $runIndex variable to track iterations without additional code
						nodes, and employ workflow static data or node run indexes to maintain state across loop cycles.`,
					category: 'looping_pagination',
					priority: 'high',
				},
			],
		},
		{
			name: 'Recommended Nodes',
			nodeRecommendations: [
				{
					name: 'HTTP Request',
					purpose: 'Fetches web pages or API data for scraping and research workflows',
					pitfalls: [
						`Double-check URL formatting, query parameters, and ensure all required fields are present to avoid
							bad request errors`,
						`Be aware of 429 rate limiting errors when the service receives too many requests - implement batching
							or use "Retry on Fail" feature`,
						`Refresh expired tokens, verify API keys, and ensure correct permissions to avoid authentication
							failures`,
					],
				},
				{
					name: 'HTML Extract',
					purpose: 'Parses HTML and extracts data using CSS selectors for web scraping',
					pitfalls: [
						`Some sites use JavaScript to render content, which may not be accessible via simple HTTP requests.
							Consider using browser automation tools or APIs if the HTML appears empty`,
						'Validate that the CSS selectors match the actual page structure to avoid extraction failures',
					],
				},
				{
					name: 'Split Out',
					purpose: 'Processes lists of items one by one for sequential operations',
					pitfalls: [
						'Can cause performance issues with very large datasets - consider using Split In Batches instead',
					],
				},
				{
					name: 'Split In Batches',
					purpose: 'Processes lists of items in batches to manage memory and performance',
					pitfalls: [
						'Ensure proper loop configuration to avoid infinite loops or skipped data',
						'Use appropriate batch sizes (e.g., 200 rows) to balance memory usage and performance',
					],
				},
				{
					name: 'Set',
					purpose: 'Manipulates data, sets variables for loop control and state management',
					pitfalls: ['Be careful with expression syntax to avoid undefined or null values'],
				},
				{
					name: 'Code',
					purpose: 'Implements custom logic for complex data transformations or pagination',
					pitfalls: [
						'Prefer built-in nodes over custom code to reduce memory usage and improve maintainability',
						'Avoid processing very large datasets in a single code execution - use batching',
					],
				},
				{
					name: 'IF',
					purpose: 'Adds conditional logic for error handling, loop control, or data filtering',
					pitfalls: ['Validate expressions carefully to avoid unexpected branching behavior'],
				},
				{
					name: 'Wait',
					purpose: 'Introduces delays to respect rate limits and avoid overloading servers',
					pitfalls: ['Balance wait times between respecting rate limits and workflow performance'],
				},
				{
					name: 'Google Sheets',
					purpose: 'Stores scraped data in spreadsheets for easy access and sharing',
					pitfalls: [
						'Be aware of Google Sheets API rate limits when writing large amounts of data',
					],
				},
				{
					name: 'Microsoft Excel',
					purpose: 'Stores scraped data in Excel files for offline analysis',
					pitfalls: ['File size limitations may apply for very large datasets'],
				},
				{
					name: 'Airtable',
					purpose: 'Saves structured data to a database with rich data types and relationships',
					pitfalls: ['Be aware of Airtable API rate limits and record size restrictions'],
				},
				{
					name: 'AI Agent',
					purpose: `For research, summarization, and advanced data extraction. AI agents can autonomously gather
						information from websites, analyze content, and organize findings into structured formats, integrating
						tools for web scraping, content analysis, and database storage`,
					pitfalls: [
						'AI outputs can be non-deterministic - validate and verify extracted data',
						'Be mindful of LLM API costs when processing large amounts of data',
					],
				},
			],
		},
		{
			name: 'Common Pitfalls to Avoid',
			guidelines: [
				{
					text: `Bad Request Errors: Double-check URL formatting, query parameters, and ensure all required fields
						are present to avoid 400 errors when making HTTP requests.`,
					category: 'error_handling',
					priority: 'medium',
				},
				{
					text: `Authentication Issues: Refresh expired tokens, verify API keys, and ensure correct permissions. Test
						credentials in the Credentials section, re-authenticate via OAuth, verify API keys aren't IP or
						scope-restricted, confirm proper permissions are granted, and test credentials externally using tools
						like Postman before deployment.`,
					category: 'error_handling',
					priority: 'high',
				},
				{
					text: `Rate Limits: Use batching and Wait nodes to avoid 429 errors. When the service receives too many
						requests, implement batching to reduce request frequency or use the "Retry on Fail" feature.`,
					category: 'performance',
					priority: 'high',
				},
				{
					text: `Memory Issues: Avoid processing very large datasets in a single run; use batching and increase server
						resources if needed. Use Split In Batches node to process 200 rows at a time, leverage built-in nodes
						instead of custom code, and increase execution timeouts via environment variables.`,
					category: 'performance',
					priority: 'high',
				},
				{
					text: `Empty or Unexpected Data: Some sites use JavaScript to render content, which may not be accessible via
						simple HTTP requests. Standard HTTP and HTML parsing nodes fail because sites load data asynchronously
						via JavaScript, leaving the initial HTML empty of actual content. Consider using browser automation
						tools, web scraping services (ScrapingBee, Ninja), or APIs if needed.`,
					category: 'data_handling',
					priority: 'medium',
				},
				{
					text: `Legal Risks: Scraping sites that explicitly forbid it in their Terms of Service can lead to bans or
						legal action. While scraping publicly available data isn't inherently illegal, violating a website's ToS
						can expose you to consequences including IP banning, legal action, or contractual claims. Always check
						ToS and robots.txt before scraping.`,
					category: 'security_compliance',
					priority: 'critical',
				},
			],
		},
	],
};
