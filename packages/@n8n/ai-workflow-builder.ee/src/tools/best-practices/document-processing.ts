import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class DocumentProcessingBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.DOCUMENT_PROCESSING;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Document Processing Workflows

## Workflow Design

Design document processing workflows with clear stages: ingestion → extraction → transformation → analysis/storage. This modular approach makes debugging easier and improves maintainability.

CRITICAL: Binary data is not automatically passed through all nodes. Always enable "Include Other Input Fields" in Set/Code nodes and configure binary data handling in transformation nodes to preserve file data throughout the pipeline.

For large-scale document processing, use sub-workflows to modularize heavy tasks. This prevents memory issues and makes workflows reusable across different document sources.

Memory management is essential when processing documents. For large files (>50MB), configure filesystem storage mode (N8N_DEFAULT_BINARY_DATA_MODE=filesystem) if self-hosted to avoid instance crashes.

## File Ingestion and Access

Use Read/Write Files from Disk for local file access on self-hosted instances. Note this node is not available on n8n Cloud.

For cloud storage, use Google Drive node or HTTP Request node to fetch files from URLs or cloud storage services. Ensure binary data is correctly mapped in the node configuration.

For form uploads or webhook file submissions, verify the binary data field name matches the configuration in downstream nodes. Incorrect field names are a common source of "binary data not found" errors.

## Text Extraction and OCR

Use Extract From File for extracting text from text-based PDFs, CSVs, Excel files, and other structured formats. This node converts binary data to JSON for downstream processing.

For image-based PDFs or scanned documents, use OCR capabilities. Mistral AI node offers "Extract Text" operation using the mistral-ocr-latest model for optical character recognition.

Choose the right extraction method for your file type: text extractors for text-based PDFs, OCR for image-based documents, and conversion steps or external APIs for formats like DOCX.

## Document Chunking and AI Processing

Use Default Data Loader to load and split documents for vector storage or AI processing. Configure the appropriate splitting strategy: Recursive Character (recommended for most cases), Character, or Token-based splitting.

For processing large datasets, use Split In Batches to process documents in manageable groups. This prevents memory overload and helps manage API rate limits when using AI nodes.

Use Summarization Chain for summarizing multiple documents. Configure chunk size and overlap appropriately - defaults are 1000 characters with 200 character overlap.

When using AI Agent or chat model nodes for document analysis, always extract text first using Extract From File or OCR nodes to convert binary data to processable text.

## Recommended Nodes

### Extract From File (n8n-nodes-base.extractfromfile)

Purpose: Converts binary data from CSV, Excel, PDF, and text files to JSON for processing

Pitfalls:

- Ensure the correct binary field name is specified in the node configuration
- Verify file format compatibility before extraction
- Does not perform OCR - only extracts existing text from documents

### HTTP Request (n8n-nodes-base.httprequest)

Purpose: Fetch files from URLs or cloud storage endpoints

Pitfalls:

- For paginated file listings, use Split In Batches to handle multiple requests
- Verify binary data is captured in the response configuration

### Google Drive (n8n-nodes-base.googledrive)

Purpose: Access and download files from Google Drive for processing

Pitfalls:

- Download operation returns binary data - verify field name for downstream nodes

### Default Data Loader (n8n-nodes-langchain.documentdefaultdataloader)

Purpose: Loads binary files or JSON data and splits into chunks for vector stores or AI processing

Pitfalls:

- Sub-node expressions resolve to the first item only - different behavior than regular nodes
- Default chunk size (1000) may be too large or small depending on your use case
- Metadata must be set during document loading for proper traceability

### Summarization Chain (n8n-nodes-langchain.chainsummarization)

Purpose: Summarizes multiple documents using LLM

Pitfalls:

- Context window limits may truncate very long documents
- Configure chunking strategy appropriately for your document size
- Verify summary quality matches requirements

### Mistral AI (n8n-nodes-base.mistralai)

Purpose: Perform OCR on image-based PDFs and scanned documents using Extract Text operation

Pitfalls:

- Requires mistral-ocr-latest model for OCR functionality
- OCR processing can be slow for large documents - consider batch processing

### Split In Batches (n8n-nodes-base.splitinbatches)

Purpose: Process documents in groups to manage memory usage and API rate limits

Pitfalls:

- n8n handles repetitive processing automatically in most cases - only use when specifically needed
- Configure batch size based on document size and available memory
- Use with Wait node between batches to avoid API rate limiting

## Common Pitfalls to Avoid

Losing Binary Data Between Nodes: Binary data is not automatically passed through all nodes. Always enable "Include Other Input Fields" in Set/Code nodes. In Split Out nodes, verify binary data preservation settings. This is especially critical in sub-workflows where binary data can be lost at workflow boundaries.

Incorrect Merge Node Configuration: Using "Append" mode in Merge can result in binary data appearing in unexpected item positions. Use "Combine" mode with appropriate matching settings to merge data from multiple branches into single items that preserve binary data correctly.

Processing Large Files in Memory: Default memory storage causes crashes with large files. For files over 50MB or high-volume processing, configure filesystem storage (N8N_DEFAULT_BINARY_DATA_MODE=filesystem) on self-hosted instances. On Cloud or when using queue mode, consider splitting large files or using external processing.

Not Handling File Types Appropriately: Using text extraction on image-based PDFs produces no results. Identify your document type first: use Extract From File for text-based documents and OCR nodes (like Mistral AI) for scanned/image-based documents. For unsupported formats like DOCX, use external APIs or community nodes for conversion.

Processing Too Much Data in Single Workflow: Processing large numbers of documents or very large files in a single workflow execution leads to memory issues and timeouts. Use Split In Batches for processing groups of documents, and leverage sub-workflows to break complex processing into manageable stages. This keeps memory usage under control and improves reliability.

File Path Resolution Issues: Using relative paths in Read/Write Files from Disk causes errors when n8n cannot locate files. Always use absolute paths. In Docker environments, remember that paths refer to the container filesystem - mount volumes appropriately or use alternative storage methods.
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
