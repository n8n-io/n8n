import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class DocumentProcessingBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.DOCUMENT_PROCESSING;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Document Processing Workflows

## Workflow Design

Document processing workflows extract and act on content from files like PDFs, images, Word documents, and spreadsheets. Design your workflow following these core patterns:

### Core Architecture Pattern
Trigger → Capture Binary → Extract Text → Parse/Transform → Route to Destination → Notify

### Common Flow Patterns

**Simple Document Processing:**
- Gmail Trigger → Check file type → Extract from File → DataTable → Slack notification
- Best for: Basic text-based PDFs with straightforward data extraction

**Complex Document Processing with AI:**
- Webhook → File Type Check → OCR (if image) → AI Extract → Validate → CRM Update → Multiple notifications
- Best for: Varied document formats requiring intelligent parsing

**Batch Document Processing:**
- Main workflow: Schedule Trigger → Fetch Files → Split In Batches → Sub-workflow → Merge Results → Bulk Update
- Sub-workflow When Executed by Another Workflow -> Process result
- Best for: High-volume processing with API rate limits

**Multi-Source Document Aggregation:**
- Multiple Triggers (Email + Drive + Webhook) → Set common fields → Standardize → Process → Store
- Best for: Documents from various channels needing unified processing

### Branching Strategy

Always branch early based on document characteristics:
- **File Type Branching**: Use IF/Switch nodes immediately after ingestion to route PDFs vs images vs spreadsheets
- **Provider Branching**: Route documents to provider-specific processing (e.g., different invoice formats)
- **Quality Branching**: Separate high-confidence extractions from those needing manual review

## Binary Data Management
Documents in n8n are handled as binary data that must be carefully preserved throughout the workflow.

### Referencing Binary Data from Other Nodes
When you need to reference binary data from a previous node, use this syntax:
- Expression: '{{ $('Node Name').item.binary.property_name }}' or {{ $binary.property_name }} if previous item
- Example for Gmail attachments: '{{ $('Gmail Trigger').item.binary.attachment_0 }}' or {{ $binary.attachment_0 }} if previous item
- Example for webhook data: '{{ $('Webhook').item.binary.data }}' or {{ $binary.data }} if previous item
- Important: The property name depends on how the previous node names the binary data

### Preserving Binary Data
- Many nodes (Code, Edit Fields, AI nodes) output JSON and drop binary data by default
- Use parallel branches: one for processing, one to preserve the original file
- Rejoin branches with Merge node in pass-through mode
- Alternative: Configure nodes to keep binary (e.g., Edit field node's "Include Other Input Fields" option ON)

### Memory Optimization
For high-volume processing:
- Process files sequentially or in small batches
- Drop unnecessary binary data after extraction to free memory

## Text Extraction Strategy

Choose extraction method based on document type and content:

### Critical: File Type Detection
**ALWAYS check the file type before using Extract from File node** (unless the file type is already known):
- Use IF node to check file extension or MIME type first
- The Extract from File node has multiple operations, each for a specific file type:
  - "Extract from PDF" for PDF files
  - "Extract from MS Excel" for Excel files (.xlsx, .xls)
  - "Extract from MS Word" for Word documents (.docx, .doc)
  - "Extract from CSV" for CSV files
  - "Extract from HTML" for HTML files
  - "Extract from RTF" for Rich Text Format files
  - "Extract from Text File" for plain text files
- Using the wrong operation will result in errors or empty output

### Decision Tree for Extraction
1. **Check file type** → Route to appropriate extraction method
2. **Scanned image/PDF?** → Use OCR service (OCR.space, AWS Textract, Google Vision)
3. **Structured invoice/receipt?** → Use specialized parser (Mindee) or AI extraction
4. **Text-based document?** → Use Extract from File with the correct operation for that file type

### Fallback Strategy
Always implement fallback for extraction failures:
- Check if text extraction returns empty
- If empty, automatically route to OCR
- If OCR fails, send to manual review queue

## Data Parsing & Classification

### AI-Powered Extraction Pattern
For varied or complex documents:

Option 1 - Using Document Loader (Recommended for binary files):
1. Pass binary data directly to Document Loader node (set Data Source to "Binary")
2. Connect to AI Agent or LLM Chain for processing
3. Use Structured Output Parser to ensure consistent JSON
4. Validate extracted fields before processing

Option 2 - Using text extraction:
1. Extract raw text using Extract from File or OCR
2. Pass to AI Agent or LLM Chain with structured prompt
3. Use Structured Output Parser to ensure consistent JSON
4. Validate extracted fields before processing

Example system prompt structure:
"Extract the following fields from the document: [field list]. Return as JSON with this schema: [schema example]"

### Document Classification Flow
Classify before processing for better accuracy:
1. Initial AI classification (Invoice vs Receipt vs Contract)
2. Route to specialized sub-workflow based on type
3. Use type-specific prompts and validation rules
4. This reduces errors and improves extraction quality

## Error Handling Strategy

Build resilience at every step:

### Validation Checkpoints
- After extraction: Verify text not empty
- After AI parsing: Validate JSON schema
- Before database insert: Check required fields
- After API calls: Verify success response

## Performance Optimization

### Batch Processing Strategy
- Use Split In Batches node: process 5-10 files at a time
- Implement delays between batches for rate-limited APIs
- Monitor memory usage and adjust batch size accordingly

## Recommended Nodes

### Triggers & Input

**Gmail Trigger (n8n-nodes-base.gmailTrigger)**
Purpose: Monitor Gmail for emails with attachments (Recommended over IMAP)
Advantages: Real-time processing, simpler authentication, better integration with Google Workspace
Critical Configuration for Attachments:
- **MUST set "Simplify" to FALSE** - otherwise attachments won't be available
- **MUST set "Download Attachments" to TRUE** to retrieve files
- Set appropriate label filters
- Set "Property Prefix Name" (e.g., "attachment_") - attachments will be named with this prefix plus index
- Important: When referencing its binary data, it will be referenced "attachment_0", "attachment_1", etc., NOT "data"

**Email Read (IMAP) (n8n-nodes-base.emailReadImap)**
Purpose: Alternative email fetching if there's no specialized node for email provider
Configuration:
- Enable "Download Attachments" to retrieve files
- Set "Property Prefix Name" (e.g., "attachment_") - attachments will be named with this prefix plus index
- Important: When referencing binary data, it will be referenced "attachment_0", "attachment_1", etc., NOT "data"

**HTTP Webhook (n8n-nodes-base.webhook)**
Purpose: Receive file uploads from web forms
Configuration: Enable "Raw Body" for binary data

**Google Drive Trigger (n8n-nodes-base.googleDriveTrigger)**
Purpose: Monitor folders for new documents
Configuration: Set appropriate folder and file type filters

### Text Extraction

**Extract from File (n8n-nodes-base.extractFromFile)**
Purpose: Extract text from various file formats using format-specific operations
Critical: ALWAYS check file type first with an IF or Switch before and select the correct operation (Extract from PDF, Extract from MS Excel, etc.)
Output: Extracted text is returned under the "text" key in JSON (e.g., access with {{ $json.text }})
Pitfalls: Returns empty for scanned documents - always check and fallback to OCR; Using wrong operation causes errors

**AWS Textract (n8n-nodes-base.awsTextract)**
Purpose: Advanced OCR with table and form detection
Best for: Structured documents like invoices and forms

**Mindee (n8n-nodes-base.mindee)**
Purpose: Specialized invoice and receipt parsing
Returns: Structured JSON with line items, totals, dates

### Data Processing

**AI Agent (@n8n/n8n-nodes-langchain.agent)**
Purpose: Intelligent document parsing and decision making
Configuration: Include structured output tools for consistent results

**LLM Chain (@n8n/n8n-nodes-langchain.chainLlm)**
Purpose: Document classification and data extraction
Use with: Structured Output Parser for JSON consistency

**Document Loader (@n8n/n8n-nodes-langchain.documentLoader)**
Purpose: Load and process documents directly from binary data for AI processing
Critical: Use the "Binary" data source option to handle binary files directly - no need to convert to JSON first
Configuration: Select "Binary" as Data Source, specify the binary property name (by default data unless renamed in a previous node)
Best for: Direct document processing in AI workflows without intermediate extraction steps

**Structured Output Parser (@n8n/n8n-nodes-langchain.outputParserStructured)**
Purpose: Ensure AI outputs match expected JSON schema
Critical for: Database inserts and API calls

### Vector Storage (for RAG/Semantic Search)
**Simple Vector Store (@n8n/n8n-nodes-langchain.vectorStore) - RECOMMENDED**
Purpose: Easy-to-setup vector storage for document embeddings
Advantages:
- No external dependencies or API keys required
- Works out of the box with local storage
- Perfect for prototyping and small to medium datasets
Configuration: Just connect and use - no complex setup needed
Best for: Most document processing workflows that need semantic search

### Flow Control

**Split In Batches (n8n-nodes-base.splitInBatches)**
Purpose: Process multiple documents in controlled batches
Configuration: Set batch size based on API limits and memory
Outputs (in order):
- Output 0 "done": Executes after all batches are processed - use for final aggregation or notifications
- Output 1 "loop": Connect processing nodes here - executes for each batch
Important: Connect processing logic to the second output (loop), completion logic to the first output (done)

**Merge (n8n-nodes-base.merge)**
Purpose: Combine data from multiple branches that need to execute together
Critical: Merge node waits for ALL input branches to complete - do NOT use for independent/optional branches
Modes: Use "Pass Through" to preserve binary from one branch

**Edit Fields (Set) (n8n-nodes-base.set)**
Purpose: Better choice for combining data from separate/independent branches
Use for: Adding fields from different sources, preserving binary while adding processed data
Configuration: Set common fields and use "Include Other Input Fields" OFF to preserve existing data including binary

**Execute Workflow Trigger (n8n-nodes-base.executeWorkflowTrigger)**
Purpose: Start point for sub-workflows that are called by other workflows
Configuration: Automatically receives data from the calling workflow including binary data
Best practice: Use for modular workflow design, heavy processing tasks, or reusable workflow components
Pairing: Must be used with Execute Workflow node in the parent workflow

**Execute Workflow (n8n-nodes-base.executeWorkflow)**
Purpose: Call and execute another workflow from within the current workflow
Critical configurations:
- Workflow ID: Use expression "{{ $workflow.id }}" to reference sub-workflows in the same workflow
- Choose execution mode: "Run Once for All Items" or "Run Once for Each Item"
- Binary data is automatically passed to the sub-workflow
Best practice: Use for delegating heavy processing, creating reusable modules, or managing memory in large batch operations

### Data Destinations

**DataTable (n8n-nodes-base.dataTable)**
Purpose: Store extracted data in n8n's built-in data tables
Operations: Insert, Update, Select rows without external dependencies
Best for: Self-contained workflows that don't require external storage

**Google Sheets (n8n-nodes-base.googleSheets)**
Purpose: Log extracted data in external spreadsheet
Operations: Use "Append" for new rows, "Update" with key column for existing
Best for: Collaborative review and manual data validation

**Database Nodes**
- Postgres (n8n-nodes-base.postgres)
- MySQL (n8n-nodes-base.mySql)
- MongoDB (n8n-nodes-base.mongoDb)
Purpose: Store structured extraction results in production databases
Best Practice: Validate data schema before insert

### Utilities

**IF/Switch (n8n-nodes-base.if, n8n-nodes-base.switch)**
Purpose: Route based on file type, extraction quality, or classification

**Function/Code (n8n-nodes-base.function, n8n-nodes-base.code)**
Purpose: Custom validation, data transformation, or regex extraction

**HTTP Request (n8n-nodes-base.httpRequest)**
Purpose: Call external OCR APIs (OCR.space, Google Vision, Mistral OCR)
Configuration: Set "Response Format: File" for downloads
Critical: NEVER set API keys directly in the request - user can set credentials from the UI for secure API key management

## Common Pitfalls to Avoid

### Binary Data Loss

**Problem**: Binary file "disappears" after processing nodes
**Solution**:
- Use Merge node to reattach binary after processing
- Or configure nodes to explicitly keep binary data
- In Code nodes: copy items[0].binary to output

### Incorrect OCR Fallback

**Problem**: Not detecting when text extraction fails
**Solution**:
- Always check if extraction result is empty
- Implement automatic OCR fallback for scanned documents
- Don't assume all PDFs have extractable text

### API Format Mismatches

**Problem**: Sending files in wrong format to APIs
**Solution**:
- Check if API needs multipart/form-data vs Base64
- Use "Extract from File" and "Convert to File" format conversion

### Memory Overload

**Problem**: Workflow crashes with large or multiple files
**Solution**:
- Process files sequentially or in small batches
- Enable filesystem mode for binary data storage
- Drop unnecessary data after extraction
- Create a sub-workflow in the same workflow using "When Executed by Another Workflow" and "Execute Workflow". Delegate the heavy part of the workflow to the sub-workflow.

### Duplicate Processing

**Problem**: Same documents processed repeatedly
**Solution**:
- Configure email triggers to mark as read
- Use "unseen" filters for email fetching
- Implement deduplication logic based on file hash or name`;

	getDocumentation(): string {
		return this.documentation;
	}
}
