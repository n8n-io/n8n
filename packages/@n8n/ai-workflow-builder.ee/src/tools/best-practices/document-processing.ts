import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class DocumentProcessingBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.DOCUMENT_PROCESSING;
	readonly version = '1.0.0';

	// community node (n8n-nodes-tesseractjs) would be useful to include
	// but not available on Cloud so leaving out for now
	private readonly documentation = `# Best Practices: Document Processing Workflows

## Workflow Design

Document processing workflows extract and act on content from files like PDFs, images, Word documents, and spreadsheets. Design your workflow following these core patterns:

### Core Architecture Pattern
Trigger → Capture Binary → Extract Text → Parse/Transform → Route to Destination → Notify

### Common Flow Patterns

**Simple Document Processing:**
- Email Trigger → Extract from File → Google Sheets → Slack notification
- Best for: Basic text-based PDFs with straightforward data extraction

**Complex Document Processing with AI:**
- Webhook → File Type Check → OCR (if image) → AI Extract → Validate → CRM Update → Multiple notifications
- Best for: Varied document formats requiring intelligent parsing

**Batch Document Processing:**
- Schedule Trigger → Fetch Files → Split In Batches → Sub-workflow → Merge Results → Bulk Update
- Best for: High-volume processing with API rate limits

**Multi-Source Document Aggregation:**
- Multiple Triggers (Email + Drive + Webhook) → Merge → Standardize → Process → Store
- Best for: Documents from various channels needing unified processing

### Branching Strategy

Always branch early based on document characteristics:
- **File Type Branching**: Use IF/Switch nodes immediately after ingestion to route PDFs vs images vs spreadsheets
- **Provider Branching**: Route documents to provider-specific processing (e.g., different invoice formats)
- **Quality Branching**: Separate high-confidence extractions from those needing manual review

## Binary Data Management

Documents in n8n are handled as binary data that must be carefully preserved throughout the workflow.

### Preserving Binary Data
- Many nodes (Function, Set, AI nodes) output JSON and drop binary data by default
- Use parallel branches: one for processing, one to preserve the original file
- Rejoin branches with Merge node in pass-through mode
- Alternative: Configure nodes to keep binary (e.g., Set node's "Keep Only Set" option OFF)

### Memory Optimization
For high-volume processing:
- Process files sequentially or in small batches
- Drop unnecessary binary data after extraction to free memory

## Text Extraction Strategy

Choose extraction method based on document type and content:

### Decision Tree for Extraction
1. **Is it a text-based PDF/DOCX?** → Use Extract from File node
2. **Is it a scanned image/PDF?** → Use OCR service (OCR.space, AWS Textract, Google Vision)
3. **Is it structured data (invoice/form)?** → Use specialized parser (Mindee) or AI extraction
4. **Is it a spreadsheet?** → Use Extract from File for direct JSON conversion

### Fallback Strategy
Always implement fallback for extraction failures:
- Check if text extraction returns empty
- If empty, automatically route to OCR
- If OCR fails, send to manual review queue

## Data Parsing & Classification

### AI-Powered Extraction Pattern
For varied or complex documents:
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

**Email Read (IMAP) (n8n-nodes-base.emailReadImap)**
Purpose: Fetch emails with attachments for processing
Configuration: Enable "Download Attachments" and optionally "Split Attachments"

**HTTP Webhook (n8n-nodes-base.webhook)**
Purpose: Receive file uploads from web forms
Configuration: Enable "Raw Body" for binary data

**Google Drive Trigger (n8n-nodes-base.googleDriveTrigger)**
Purpose: Monitor folders for new documents
Configuration: Set appropriate folder and file type filters

### Text Extraction

**Extract from File (n8n-nodes-base.extractFromFile)**
Purpose: Extract text from PDFs, Excel, CSV, HTML files
Pitfalls: Returns empty for scanned documents - always check and fallback to OCR

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

**Structured Output Parser (@n8n/n8n-nodes-langchain.outputParserStructured)**
Purpose: Ensure AI outputs match expected JSON schema
Critical for: Database inserts and API calls

### Flow Control

**Split In Batches (n8n-nodes-base.splitInBatches)**
Purpose: Process multiple documents in controlled batches
Configuration: Set batch size based on API limits and memory

**Merge (n8n-nodes-base.merge)**
Purpose: Rejoin binary data with processed results
Modes: Use "Pass Through" to preserve binary from one branch

**Execute Workflow (n8n-nodes-base.executeWorkflow)**
Purpose: Modular sub-workflow execution
Critical: Enable "Include Binary Data" option

### Data Destinations

**Google Sheets (n8n-nodes-base.googleSheets)**
Purpose: Log extracted data in spreadsheet
Operations: Use "Append" for new rows, "Update" with key column for existing

**Database Nodes**
- Postgres (n8n-nodes-base.postgres)
- MySQL (n8n-nodes-base.mySql)
- MongoDB (n8n-nodes-base.mongoDb)
Purpose: Store structured extraction results
Best Practice: Validate data schema before insert

### Utilities

**IF/Switch (n8n-nodes-base.if, n8n-nodes-base.switch)**
Purpose: Route based on file type, extraction quality, or classification

**Function/Code (n8n-nodes-base.function, n8n-nodes-base.code)**
Purpose: Custom validation, data transformation, or regex extraction

**HTTP Request (n8n-nodes-base.httpRequest)**
Purpose: Call external OCR APIs (OCR.space, Google Vision, Mistral OCR)
Configuration: Set "Response Format: File" for downloads, use proper auth

## Common Pitfalls to Avoid

### Binary Data Loss

**Problem**: Binary file "disappears" after processing nodes
**Solution**:
- Use Merge node to reattach binary after processing
- Or configure nodes to explicitly keep binary data
- In Function nodes: copy items[0].binary to output

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
- Use Move Binary Data (n8n-nodes-base.moveBinaryData) node for format conversion
- Test API requirements with Postman/cURL first

### Memory Overload

**Problem**: Workflow crashes with large or multiple files
**Solution**:
- Process files sequentially or in small batches
- Enable filesystem mode for binary data storage
- Drop unnecessary data after extraction

### Duplicate Processing

**Problem**: Same documents processed repeatedly
**Solution**:
- Configure email triggers to mark as read
- Use "unseen" filters for email fetching
- Implement deduplication logic based on file hash or name

### Missing Error Handling

**Problem**: Silent failures when extraction or parsing fails
**Solution**:
- Add validation after every critical step
- Log failures for manual review
- Never assume AI extraction will always return expected fields`;

	getDocumentation(): string {
		return this.documentation;
	}
}
