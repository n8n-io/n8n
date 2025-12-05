import type { INodeProperties } from 'n8n-workflow';

export const scriptOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['script'],
			},
		},
		options: [
			{
				name: 'Execute Puppeteer Script',
				value: 'script',
				description:
					'Execute a custom Puppeteer script with full access to page and browser objects',
				action: 'Execute script',
			},
		],
		default: 'script',
	},
];

export const scriptFields: INodeProperties[] = [
	// Script code
	{
		displayName: 'Script',
		name: 'script',
		type: 'string',
		typeOptions: {
			rows: 10,
		},
		required: true,
		default: '',
		placeholder: `// Access to 'page' and 'browser' objects
// Example: Scrape all links from a page
const links = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('a'))
    .map(a => ({ text: a.textContent, href: a.href }));
});
return links;`,
		description:
			'Puppeteer script to execute. You have access to `page` and `browser` objects. Use `return` to output data.',
		displayOptions: {
			show: {
				resource: ['script'],
				operation: ['script'],
			},
		},
	},
	// Timeout
	{
		displayName: 'Timeout (Ms)',
		name: 'timeout',
		type: 'number',
		default: 60000,
		description: 'Maximum time for script execution in milliseconds',
		displayOptions: {
			show: {
				resource: ['script'],
				operation: ['script'],
			},
		},
	},
];
