import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class ScrapingAndResearchBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.SCRAPING_AND_RESEARCH;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Scraping & Research Workflows

## Performance & Resource Management

Batch requests and introduce delays to avoid hitting API rate limits or overloading target servers. Use Wait nodes and
batching options in HTTP Request nodes. When 429 rate limiting errors occur due to receiving too many requests,
implement batching to reduce request frequency or use the "Retry on Fail" feature to automatically handle throttled
responses.

Workflows processing large datasets can crash due to memory constraints. Use the Split In Batches node to process 200
rows at a time to reduce memory usage, leverage built-in nodes instead of custom code, and increase execution timeouts
via environment variables for better resource management.

## Looping & Pagination

Implement robust looping for paginated data. Use Set, IF, and Code nodes to manage page numbers and loop conditions,
ensuring you don't miss data or create infinite loops. Leverage n8n's built-in mechanisms rather than manual approaches:
use the $runIndex variable to track iterations without additional code nodes, and employ workflow static data or node
run indexes to maintain state across loop cycles.

## Recommended Nodes

### HTTP Request (n8n-nodes-base.httpRequest)

Purpose: Fetches web pages or API data for scraping and research workflows

Pitfalls:

- Depending on the data which the user wishes to scrape/research, it maybe against the terms of service to attempt to
fetch it from the site directly. Using scraping nodes is the best way to get around this.

Pitfalls:

- Double-check URL formatting, query parameters, and ensure all required fields are present to avoid bad request errors
- Be aware of 429 rate limiting errors when the service receives too many requests - implement batching or use "Retry on
Fail" feature
- Refresh expired tokens, verify API keys, and ensure correct permissions to avoid authentication failures

### SerpAPI (@n8n/n8n-nodes-langchain.toolSerpApi)

Purpose: Give an agent the ability to search for research materials and fact-checking results that have been retrieved
from other sources.

### Perplexity (n8n-nodes-base.perplexityTool)

Purpose: Give an agent the ability to search utilising Perplexity, a powerful tool for finding sources/material for
generating reports and information.

### HTML Extract (n8n-nodes-base.htmlExtract)

Purpose: Parses HTML and extracts data using CSS selectors for web scraping

Pitfalls:

- Some sites use JavaScript to render content, which may not be accessible via simple HTTP requests. Consider using
browser automation tools or APIs if the HTML appears empty
- Validate that the CSS selectors match the actual page structure to avoid extraction failures

### Split Out (n8n-nodes-base.splitOut)

Purpose: Processes lists of items one by one for sequential operations

Pitfalls:
- Can cause performance issues with very large datasets - consider using Split In Batches instead

### Loop Over Items (Split in Batches) (n8n-nodes-base.splitInBatches)

Purpose: Processes lists of items in batches to manage memory and performance

Pitfalls:
- Ensure proper loop configuration to avoid infinite loops or skipped data. The index 0
(first connection) of the loop is treated as the done state, while the index 1 (second connection)
is the connection that loops.
- Use appropriate batch sizes (e.g., 200 rows) to balance memory usage and performance

### Edit Fields (Set) (n8n-nodes-base.set)

Purpose: Manipulates data, sets variables for loop control and state management

### Code (n8n-nodes-base.code)

Purpose: Implements custom logic for complex data transformations or pagination

Pitfalls:

- Prefer built-in nodes over custom code to reduce memory usage and improve maintainability
- Avoid processing very large datasets in a single code execution - use batching

### If (n8n-nodes-base.if)

Purpose: Adds conditional logic for error handling, loop control, or data filtering

Pitfalls:
- Validate expressions carefully to avoid unexpected branching behavior

### Wait (n8n-nodes-base.wait)

Purpose: Introduces delays to respect rate limits and avoid overloading servers

### Data Tables (n8n-nodes-base.dataTable)

Purpose: Stores scraped data in n8n's built-in persistent data storage

### Google Sheets (n8n-nodes-base.googleSheets)

Purpose: Stores scraped data in spreadsheets for easy access and sharing

### Microsoft Excel 365 (n8n-nodes-base.microsoftExcel)

Purpose: Stores scraped data in Excel files for offline analysis

### Airtable (n8n-nodes-base.airtable)

Purpose: Saves structured data to a database with rich data types and relationships

### AI Agent (@n8n/n8n-nodes-langchain.agent)

Purpose: For research, summarization, and advanced data extraction. AI agents can autonomously gather information
from websites, analyze content, and organize findings into structured formats, integrating tools for web scraping,
content analysis, and database storage

### Scraping Nodes

- Phantombuster (n8n-nodes-base.phantombuster)
- Apify (use HTTP Request or community node)
- BrightData (use HTTP Request or community node)

Purpose: If the user wishes to scrap data from sites like LinkedIn, Facebook, Instagram, Twitter/X, Indeed, Glassdoor
or any other service similar to these large providers it is better to use a node designed for this. The scraping
nodes provide access to these datasets while avoiding issues like rate limiting or breaking terms of service for
sites like these.

## Common Pitfalls to Avoid

Bad Request Errors: Double-check URL formatting, query parameters, and ensure all required fields are present to
avoid 400 errors when making HTTP requests.

Rate Limits: Use batching and Wait nodes to avoid 429 errors. When the service receives too many requests, implement
batching to reduce request frequency or use the "Retry on Fail" feature.

Memory Issues: Avoid processing very large datasets in a single run; use batching and increase server resources if
needed. Use Split In Batches node to process 200 rows at a time, leverage built-in nodes instead of custom code, and
increase execution timeouts via environment variables.

Empty or Unexpected Data: Some sites use JavaScript to render content, which may not be accessible via simple HTTP
requests. Standard HTTP and HTML parsing nodes fail because sites load data asynchronously via JavaScript, leaving the
initial HTML empty of actual content. Web scraping nodes can be used to avoid this.
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
