import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class EnrichmentBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.ENRICHMENT;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Data Enrichment Workflows

## Workflow Design

### Core Principles
- Start with data retrieval and validation before enrichment
- Process data incrementally to avoid overwhelming APIs
- Always include error handling for failed enrichments
- Design for reusability with sub-workflows where appropriate

### Architecture Pattern
1. **Input Stage**: Validate and prepare incoming data
2. **Enrichment Stage**: Parallel or sequential API calls based on dependencies
3. **Transformation Stage**: Normalize and merge enriched data
4. **Output Stage**: Format and deliver enriched results

## Data Enrichment Guidelines

### 1. Input Validation
**Always validate incoming data before enrichment**
- Use IF node (n8n-nodes-base.if) to check for required fields
- Implement Set node (n8n-nodes-base.set) to standardize data format
- Add Code node (n8n-nodes-base.code) for complex validation logic

### 2. API Rate Limiting
**Respect external service limits**
- Implement Wait node (n8n-nodes-base.wait) between batch requests
- Use SplitInBatches node (n8n-nodes-base.splitInBatches) for large datasets
- Set batch size: 10-50 items depending on API limits
- Add delay: 1-2 seconds between batches

### 3. Error Handling
**Build resilient enrichment flows**
- Wrap API calls in Try/Catch pattern using Error Trigger node
- Use StopAndError node (n8n-nodes-base.stopAndError) for critical failures
- Implement fallback enrichment sources with Switch node (n8n-nodes-base.switch)
- Log failures to database or file for later retry

### 4. Data Merging
**Combine enriched data effectively**
- Use Merge node (n8n-nodes-base.merge) with "Merge By Key" mode
- Specify unique identifiers for accurate matching
- Handle missing enrichment data with default values
- Preserve original data alongside enrichments

### 5. Caching Strategy
**Minimize redundant API calls**
- Check cache before making external requests
- Use Redis node (n8n-nodes-base.redis) or database for caching
- Set appropriate TTL values:
  - Static data: 7-30 days
  - Dynamic data: 1-24 hours
  - Real-time data: No caching

### 6. Field Mapping
**Standardize enriched data structure**
- Use Set node to rename fields consistently
- Remove unnecessary fields with unset operations
- Apply data transformations in Code node for complex mappings
- Document field mappings in workflow description

### 7. Quality Scoring
**Assess enrichment quality**
- Add confidence scores to enriched fields
- Track enrichment source for each field
- Implement validation rules for enriched data
- Flag incomplete or suspicious enrichments

## Recommended Nodes

### Essential Nodes

**HTTP Request** (n8n-nodes-base.httpRequest):
- Purpose: Primary enrichment API calls
- Use cases: Call external APIs for data enrichment
- Best practices: Configure proper authentication, handle timeouts

**Merge** (n8n-nodes-base.merge):
- Purpose: Combine original and enriched data
- Modes: Merge By Key, Merge By Index, Append
- Best practices: Use unique identifiers for matching, handle missing data

**Set** (n8n-nodes-base.set):
- Purpose: Transform and standardize data
- Use cases: Rename fields, remove unnecessary data, add metadata
- Best practices: Use "Keep Only Set" carefully, document transformations

**IF** (n8n-nodes-base.if):
- Purpose: Conditional enrichment logic
- Use cases: Validate required fields, route based on data quality
- Best practices: Check for null values, validate data types

**SplitInBatches** (n8n-nodes-base.splitInBatches):
- Purpose: Process large datasets in chunks
- Use cases: Handle datasets with 100+ items
- Best practices: Set appropriate batch size (10-50 items), add delays

### Enrichment Sources

**Clearbit** (n8n-nodes-base.clearbit):
- Purpose: Company and person enrichment
- Use cases: Enrich email addresses with company data, get person details
- Best practices: Handle rate limits, cache results

**Hunter** (n8n-nodes-base.hunter):
- Purpose: Email finder and verification
- Use cases: Find email addresses, verify email validity
- Best practices: Respect API quotas, handle verification failures

**Brandfetch** (n8n-nodes-base.Brandfetch):
- Purpose: Company branding data
- Use cases: Get company logos, colors, brand assets
- Best practices: Cache brand data, handle missing brands

**OpenAI** (@n8n/n8n-nodes-langchain.openAi):
- Purpose: AI-powered data enrichment
- Use cases: Extract insights, classify data, generate descriptions
- Best practices: Minimize token usage, batch similar requests

**Google Sheets** (n8n-nodes-base.googleSheets):
- Purpose: Lookup table enrichment
- Use cases: Reference data enrichment, mapping tables
- Best practices: Use efficient lookup methods, cache sheet data

### Utility Nodes

**Code** (n8n-nodes-base.code):
- Purpose: Custom enrichment logic
- Use cases: Complex transformations, custom algorithms
- Best practices: Keep code modular, handle errors gracefully

**Wait** (n8n-nodes-base.wait):
- Purpose: Rate limiting delays
- Use cases: Add delays between API calls, implement backoff
- Best practices: Use appropriate delay values (1-2 seconds)

**DateTime** (n8n-nodes-base.dateTime):
- Purpose: Timestamp handling
- Use cases: Add enrichment timestamps, calculate ages
- Best practices: Use consistent timezone handling

**Redis** (n8n-nodes-base.redis):
- Purpose: Caching layer
- Use cases: Cache enrichment results, track processed items
- Best practices: Set appropriate TTL, handle cache misses

**Error Trigger** (n8n-nodes-base.errorTrigger):
- Purpose: Error handling workflow
- Use cases: Global error handling, logging failures
- Best practices: Implement retry logic, alert on critical failures

**Switch** (n8n-nodes-base.switch):
- Purpose: Route based on enrichment results
- Use cases: Fallback enrichment sources, quality-based routing
- Best practices: Always define default case

**Stop and Error** (n8n-nodes-base.stopAndError):
- Purpose: Halt workflow on critical failures
- Use cases: Stop processing on invalid data, critical API failures
- Best practices: Use for unrecoverable errors only

## Common Pitfalls to Avoid

### Performance Issues

**Problem**: Enriching all fields for every record
- **Solution**: Only enrich fields that are actually needed
- Profile your workflow to identify bottlenecks
- Use conditional enrichment based on data needs

**Problem**: Sequential processing of independent enrichments
- **Solution**: Use parallel branches for non-dependent enrichments
- Split workflow into parallel paths
- Merge results after parallel processing

**Problem**: No batching for large datasets
- **Solution**: Always use SplitInBatches for >100 items
- Set appropriate batch sizes (10-50 items)
- Add delays between batches

### Data Quality Problems

**Problem**: Overwriting original data with enrichments
- **Solution**: Preserve original data and add enriched fields separately
- Use Set node to add new fields without removing original ones
- Document which fields are enriched

**Problem**: Not handling null or missing enrichment results
- **Solution**: Implement fallback values and error flags
- Use IF nodes to check for empty results
- Add default values for missing enrichments

**Problem**: Mixing data types in enriched fields
- **Solution**: Enforce consistent data types through validation
- Convert types explicitly in Set or Code nodes
- Document expected data types

### Resource Management

**Problem**: No rate limiting on external APIs
- **Solution**: Implement delays and respect API quotas
- Use Wait node between API calls
- Monitor API usage and adjust delays

**Problem**: Infinite retry loops on failures
- **Solution**: Set maximum retry attempts (typically 3)
- Use exponential backoff for retries
- Log failed attempts for manual review

**Problem**: No caching of expensive enrichments
- **Solution**: Cache results with appropriate expiration times
- Use Redis or database for caching
- Set TTL based on data freshness requirements

### Workflow Design Flaws

**Problem**: Single point of failure for entire enrichment
- **Solution**: Use error boundaries and continue on failure options
- Enable "Continue on Fail" for non-critical enrichments
- Implement Error Trigger workflow

**Problem**: Hard-coded API keys in workflows
- **Solution**: Use credentials and environment variables
- Store sensitive data in n8n credentials system
- Never commit credentials in workflow JSON

**Problem**: No monitoring or logging of enrichment quality
- **Solution**: Add metrics collection and alerting
- Log enrichment success/failure rates
- Track enrichment coverage and quality

### Common Error Scenarios

**API Rate Limits**:
- Implement exponential backoff
- Add Wait nodes with increasing delays
- Use SplitInBatches to control request rate

**Invalid API Responses**:
- Validate response structure before processing
- Use IF nodes to check response format
- Log unexpected responses for debugging

**Timeout Issues**:
- Set reasonable timeout values (10-30s)
- Use shorter timeouts for non-critical enrichments
- Implement retry logic for timeouts

**Data Mismatches**:
- Use fuzzy matching for lookups
- Normalize data before matching
- Handle missing keys gracefully

**Duplicate Enrichments**:
- Implement deduplication logic
- Check cache before enriching
- Use unique identifiers for tracking
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
