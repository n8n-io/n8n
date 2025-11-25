import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class DataExtractionBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.DATA_EXTRACTION;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Data Extraction Workflows

## Node Selection by Data Type

Choose the right node for your data source. Use Extract From File for CSV, Excel, PDF, and text files to convert binary data to JSON for further processing.

Use Information Extractor or AI nodes for extracting structured data from unstructured text such as PDFs or emails using LLMs.

For binary data, ensure you use nodes like Extract From File to handle files properly.

### Referencing Binary Data from Other Nodes
When you need to reference binary data from a previous node, use this syntax:
- Expression: '{{ $('Node Name').item.binary.property_name }}' or {{ $binary.property_name }} if previous item
- Example for Gmail attachments: '{{ $('Gmail Trigger').item.binary.attachment_0 }}' or {{ $binary.attachment_0 }} if previous item
- Example for webhook data: '{{ $('Webhook').item.binary.data }}' or {{ $binary.data }} if previous item
- Important: The property name depends on how the previous node names the binary data

## Data Structure & Type Management

Normalize data structure early in your workflow. Use transformation nodes like Split Out, Aggregate, or Set to ensure your data matches n8n's expected structure: an array of objects with a json key.
Not transforming incoming data to n8n's expected format causes downstream node failures.

When working with large amounts of information, n8n's display can be hard to view. Use the Edit Fields node to help organize and view data more clearly during development and debugging.

## Large File Handling

Process files in batches or use sub-workflows to avoid memory issues. For large binary files, consider enabling filesystem mode (N8N_DEFAULT_BINARY_DATA_MODE=filesystem) if self-hosted, to store binary data on disk instead of memory.

Processing too many items or large files at once can crash your instance. Always batch or split processing for large datasets to manage memory effectively.

## Binary Data Management

Binary data can be lost if intermediate nodes (like Set or Code) do not have "Include Other Input Fields" enabled, especially in sub-workflows. Always verify binary data is preserved through your workflow pipeline.

## AI-Powered Extraction

Leverage AI for unstructured data using nodes like Information Extractor or Summarization Chain to extract structured data from unstructured sources such as PDFs, emails, or web pages.

## Recommended Nodes

### Extract From File (n8n-nodes-base.extractFromFile)

Purpose: Converts binary data from CSV, Excel, PDF, and text files to JSON for processing

Pitfalls:

- Ensure the correct binary field name is specified in the node configuration
- Verify file format compatibility before extraction

### HTML Extract (n8n-nodes-base.htmlExtract)

Purpose: Scrapes data from web pages using CSS selectors

### Split Out (n8n-nodes-base.splitOut)

Purpose: Processes arrays of items individually for sequential operations

### Edit Fields (Set) (n8n-nodes-base.set)

Purpose: Data transformation and mapping to normalize structure

Pitfalls:

- Enable "Include Other Input Fields" to preserve binary data
- Pay attention to data types - mixing types causes unexpected failures

### Information Extractor (@n8n/n8n-nodes-langchain.informationExtractor)

Purpose: AI-powered extraction of structured data from unstructured text

Pitfalls:

- Requires proper schema definition for extraction

### Summarization Chain (@n8n/n8n-nodes-langchain.chainSummarization)

Purpose: Summarizes large text blocks using AI for condensed information extraction

Pitfalls:

- Context window limits may truncate very long documents
- Verify summary quality matches requirements

### HTTP Request (n8n-nodes-base.httpRequest)

Purpose: Fetches data from APIs or web pages for extraction

### Code (n8n-nodes-base.code)

Purpose: Custom logic for complex data transformations

## Common Pitfalls to Avoid

Data Type Confusion: People often mix up data types - n8n can be very lenient but it can lead to problems. Pay close attention to what type you are getting and ensure consistency throughout the workflow.

Binary Data Loss: Binary data can be lost if intermediate nodes (Set, Code) do not have "Include Other Input Fields" enabled, especially in sub-workflows. Always verify binary data preservation.

Large Data Display Issues: n8n displaying large amounts of information can be hard to view during development. Use the Edit Fields node to help organize and view data more clearly.
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
