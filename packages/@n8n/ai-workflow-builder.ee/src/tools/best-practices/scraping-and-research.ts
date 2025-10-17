import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class ScrapingAndResearchBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.SCRAPING_AND_RESEARCH;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Scraping & Research Workflows

Version: 1.0.0

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

### HTTP Request

Purpose: Fetches web pages or API data for scraping and research workflows

Pitfalls:

- Double-check URL formatting, query parameters, and ensure all required fields are present to avoid bad request errors
- Be aware of 429 rate limiting errors when the service receives too many requests - implement batching or use "Retry on
Fail" feature
- Refresh expired tokens, verify API keys, and ensure correct permissions to avoid authentication failures

### HTML Extract

Purpose: Parses HTML and extracts data using CSS selectors for web scraping

Pitfalls:

- Some sites use JavaScript to render content, which may not be accessible via simple HTTP requests. Consider using
browser automation tools or APIs if the HTML appears empty
- Validate that the CSS selectors match the actual page structure to avoid extraction failures

### Split Out

Purpose: Processes lists of items one by one for sequential operations

Pitfalls:
- Can cause performance issues with very large datasets - consider using Split In Batches instead

### Split In Batches

Purpose: Processes lists of items in batches to manage memory and performance

Pitfalls:
- Ensure proper loop configuration to avoid infinite loops or skipped data
- Use appropriate batch sizes (e.g., 200 rows) to balance memory usage and performance

### Set

Purpose: Manipulates data, sets variables for loop control and state management

### Code

Purpose: Implements custom logic for complex data transformations or pagination

Pitfalls:

- Prefer built-in nodes over custom code to reduce memory usage and improve maintainability
- Avoid processing very large datasets in a single code execution - use batching

### IF

Purpose: Adds conditional logic for error handling, loop control, or data filtering

Pitfalls:
- Validate expressions carefully to avoid unexpected branching behavior

### Wait

Purpose: Introduces delays to respect rate limits and avoid overloading servers

### Google Sheets

Purpose: Stores scraped data in spreadsheets for easy access and sharing

### Microsoft Excel

Purpose: Stores scraped data in Excel files for offline analysis

### Airtable

Purpose: Saves structured data to a database with rich data types and relationships

### AI Agent

Purpose: For research, summarization, and advanced data extraction. AI agents can autonomously gather information
from websites, analyze content, and organize findings into structured formats, integrating tools for web scraping,
content analysis, and database storage

## Common Pitfalls to Avoid

Bad Request Errors: Double-check URL formatting, query parameters, and ensure all required fields are present to
avoid 400 errors when making HTTP requests.

Authentication Issues: Refresh expired tokens, verify API keys, and ensure correct permissions. Test credentials in
the Credentials section, re-authenticate via OAuth, verify API keys aren't IP or scope-restricted, confirm proper
permissions are granted, and test credentials externally using tools like Postman before deployment.

Rate Limits: Use batching and Wait nodes to avoid 429 errors. When the service receives too many requests, implement
batching to reduce request frequency or use the "Retry on Fail" feature.

Memory Issues: Avoid processing very large datasets in a single run; use batching and increase server resources if
needed. Use Split In Batches node to process 200 rows at a time, leverage built-in nodes instead of custom code, and
increase execution timeouts via environment variables.

Empty or Unexpected Data: Some sites use JavaScript to render content, which may not be accessible via simple HTTP
requests. Standard HTTP and HTML parsing nodes fail because sites load data asynchronously via JavaScript, leaving the
initial HTML empty of actual content. Consider using browser automation tools, web scraping services (ScrapingBee,
Ninja), or APIs if needed.
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
