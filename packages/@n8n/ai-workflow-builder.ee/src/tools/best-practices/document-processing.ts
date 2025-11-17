import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class DocumentProcessingBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.DOCUMENT_PROCESSING;
	readonly version = '1.0.0';

	// community node (n8n-nodes-tesseractjs) would be useful to include
	// but not available on Cloud so leaving out for now
	private readonly documentation = `# Best Practices: Document Processing

## Workflow Design

### Core Architecture
Trigger → Extract → Parse → Transform → Route → Notify

### Typical Flow Patterns
**Simple Document Processing**:
- Webhook/Trigger → Extract from File → Google Sheets → Slack notification

**Complex Document Processing**:
- Trigger → OCR (if image) → Extract → AI Parser → Data validation → CRM update → Multiple notifications

**Batch Processing**:
- Trigger → Split In Batches → Sub-workflow → Merge results → Bulk update

## Document Capture Strategy

### Trigger Selection
- **Web Form Uploads**: Use \`HTTP Webhook\` trigger with "Raw body" enabled for binary file data
- **Cloud Storage**: Use dedicated triggers:
  - \`Google Drive Trigger\` - monitor folders for new files
  - Similar nodes for Dropbox, OneDrive, S3
- **Email Attachments**: Use \`Email Read (IMAP)\` or Gmail/Outlook integrations
- **Scheduled Checks**: Use \`Schedule\` node only when event-based triggers unavailable

**Best Practice**: Match trigger to document entry point. Webhooks for forms, Drive trigger for cloud uploads.

## Text Extraction Methods

### Standard Documents (Text-based PDFs/DOCX)
- Use \`Extract from File\` node (formerly "Read PDF")
- Outputs: JSON/text format
- Note: Raw extraction yields unstructured text blocks

### Structured Data (Invoices, Forms)
**Dedicated Parsers** (Preferred for accuracy):
- \`Mindee\` node - invoice/receipt parsing with structured JSON output

**AI-Based Extraction** (Variable documents):
1. Use \`Extract from File\` for raw text
2. Apply \`LLM Chain\` nodes with AI models (OpenAI/Anthropic) with specific prompts
3. Use \`Structured Output Parser\` node to ensure JSON response

**Custom Parsing**:
- \`Function\` or \`Code\` node for regex patterns on consistent templates

### OCR for Images/Scanned Documents
- **API Options**:
  - \`AWS Textract\` node - structure detection (tables/forms)
  - Google Vision API via \`HTTP Request\`
  - OCR.space, Mistral OCR, Mathpix via \`HTTP Request\`

## Data Routing Best Practices

### CRM Updates
**Workflow Pattern**:
1. Search for existing record using unique identifier
2. Use \`IF\` node to check existence
3. Update if exists, create if new
4. Use \`Edit Fields (Set)\` or \`Code\` node for data formatting

### Spreadsheet/Database Logging
**Google Sheets** (Most common):
- Append operation for new rows per document
- Update operation with key column for existing data
- Ensure service account has proper access

**Databases**:
- \`Postgres\` or \`MySQL\` nodes for structured storage

### Notifications
- Trigger after successful processing/updates
- Include summary of processed data
- Alert on errors requiring manual intervention

## Automation Requirements

### Error Handling
- Add \`IF\` nodes after critical steps to check:
  - Empty extraction results
  - Missing required fields

### Performance Optimization
- Use \`Split In Batches\` node for multiple files
- Consider sub-workflows for parallel processing
- Monitor API rate limits, add delays if needed

## Recommended Nodes

### Essential Nodes
- **Triggers**: \`HTTP Webhook\` (n8n-nodes-base.webhook), \`Google Drive Trigger\` (n8n-nodes-base.googleDriveTrigger), \`Email Read (IMAP)\` (n8n-nodes-base.emailReadImap), \`Schedule\` (n8n-nodes-base.scheduleTrigger)
- **Extraction**: \`Extract from File\` (n8n-nodes-base.extractFromFile), \`Mindee\` (n8n-nodes-base.mindee)
- **Data Processing**: \`Edit Fields (Set)\` (n8n-nodes-base.set), \`Code\` (n8n-nodes-base.code), \`Function\` (n8n-nodes-base.function), \`IF\` (n8n-nodes-base.if)
- **Destinations**: \`Google Sheets\` (n8n-nodes-base.googleSheets), \`Salesforce\` (n8n-nodes-base.salesforce), \`HubSpot\` (n8n-nodes-base.hubspot), \`Postgres\` (n8n-nodes-base.postgres), \`MySQL\` (n8n-nodes-base.mySql)
- **Notifications**: \`Gmail Send\` (n8n-nodes-base.gmail), \`Slack\` (n8n-nodes-base.slack), \`Microsoft Teams\` (n8n-nodes-base.microsoftTeams)

### Advanced Nodes
- **AI Processing**: \`LLM Chain\` (@n8n/n8n-nodes-langchain.chainLlm), \`Structured Output Parser\` (@n8n/n8n-nodes-langchain.outputParserStructured), \`OpenAI\` (n8n-nodes-base.openAi), \`Anthropic Chat Model\` (@n8n/n8n-nodes-langchain.lmChatAnthropic)
- **OCR**: \`AWS Textract\` (n8n-nodes-base.awsTextract)
- **Utilities**: \`Split In Batches\` (n8n-nodes-base.splitInBatches), \`Merge\` (n8n-nodes-base.merge), \`No Operation\` (n8n-nodes-base.noOp)
- **Error Handling**: \`Error Trigger\` (n8n-nodes-base.errorTrigger), \`Stop and Error\` (n8n-nodes-base.stopAndError)

### Integration via HTTP Request
- OCR.space API
- Google Vision API
- Mistral OCR
- Mathpix
- Custom webhook endpoints

## Common Pitfalls to Avoid

### Extraction Issues
- **Pitfall**: Assuming all PDFs have extractable text
  - **Solution**: Check if extraction is empty, fallback to OCR

- **Pitfall**: Using raw text extraction for structured documents
  - **Solution**: Use dedicated parsers (Mindee) or AI-based extraction for invoices/forms

- **Pitfall**: Not handling multi-page documents properly
  - **Solution**: Ensure extraction method processes all pages

### Data Handling Mistakes
- **Pitfall**: Creating duplicate CRM records
  - **Solution**: Always search before create, use unique identifiers

- **Pitfall**: Overwriting data in spreadsheets
  - **Solution**: Use Append for new entries, Update only with proper key matching

- **Pitfall**: Losing data on extraction failures
  - **Solution**: Store original files until processing confirmed successful

### Performance Problems
- **Pitfall**: Workflow timeout on large files
  - **Solution**: Implement batch processing, increase timeout limits

- **Pitfall**: Hitting API rate limits
  - **Solution**: Add delay nodes, implement queue system

- **Pitfall**: Memory issues with multiple large PDFs
  - **Solution**: Process files sequentially, not in parallel

### Integration Failures
- **Pitfall**: Hardcoding credentials in workflows
  - **Solution**: Don't include credentials in workflow

- **Pitfall**: Not handling API failures
  - **Solution**: Implement retry logic with exponential backoff

- **Pitfall**: Assuming consistent document formats
  - **Solution**: Build flexible parsing with fallback options
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
