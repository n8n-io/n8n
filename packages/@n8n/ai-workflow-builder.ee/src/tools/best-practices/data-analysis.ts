import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class DataAnalysisBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.DATA_ANALYSIS;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Data Analysis Workflows

## Workflow Design

Structure workflows following the Input → Transform → Output pattern. Use clear node naming (e.g., "Fetch Sales Data", "Calculate Averages", "IF High Variance?") to document the flow.

Start with appropriate triggers:
- Manual Trigger for on-demand analysis
- Cron/Schedule Trigger for periodic analysis (daily/weekly reports)
- Webhook Trigger for event-driven analysis

Break complex workflows into modular sub-workflows using the Execute Workflow node for reusable components like "Outlier Detection" or "Data Preparation".

CRITICAL: For large datasets, use Split In Batches node to process items in chunks (e.g., 100 at a time) to prevent memory issues. Always test with realistic data volumes.

Example pattern:
- Trigger → HTTP Request (fetch data) → Spreadsheet File (parse CSV) → Set (clean fields) → Filter (remove nulls) → Code (analyze) → HTML (format report) → Email (send results)

## Data Preparation Strategy

1. **Fetch Data**: Use dedicated integration nodes or HTTP Request for APIs. Import cURL commands directly to HTTP node for complex APIs.
2. **Parse & Convert**: Convert to JSON using Spreadsheet File node for CSV/Excel. Enable "Convert types where required" on condition nodes.
3. **Clean Data**: Use Set node with "Keep Only Set" enabled to drop unused fields. Filter node for removing null values or focusing on data subsets.
4. **Merge/Enrich**: Use Merge node by key or index to combine multiple sources. Choose correct merge mode to avoid mismatched items.

## Analysis Implementation

Use Function node (not Function Item) when analysis needs all items as a whole (calculating totals, finding trends). Function Item operates per item only.

For AI-powered analysis, filter irrelevant content first to minimize tokens. Batch data into single prompts when possible.

Always pin data after external calls to test downstream logic without re-fetching. This saves API costs and speeds development.

## Output & Integration

Format results appropriately:
- HTML/Markdown nodes for reports
- Set node to prepare specific output fields (totalSales, anomalyCount)
- Database nodes to store analysis history
- Webhook Response for API-triggered workflows

Use conditional branches (IF nodes) for post-analysis actions:
- Create tasks if anomalies detected
- Send alerts for critical thresholds
- Avoid infinite loops by using proper conditions

## Recommended Nodes

### HTTP Request (n8n-nodes-base.httpRequest)

**Purpose**: Fetch datasets from URLs or APIs

**Use Cases**:
- Pull data from REST APIs for analysis
- Fetch CSV/JSON files from URLs
- Query external data sources

**Best Practices**:
- Import cURL commands for complex requests
- Use authentication credentials properly
- Handle pagination for large datasets

### Spreadsheet File (n8n-nodes-base.spreadsheetFile)

**Purpose**: Parse CSV/Excel files into JSON items for processing

**Use Cases**:
- Import CSV data from file uploads
- Process Excel spreadsheets
- Convert tabular data to JSON

**Best Practices**:
- Specify correct file format
- Handle header rows properly
- Test with various file encodings

### Set / Edit Fields (n8n-nodes-base.set)

**Purpose**: Clean data, select relevant fields, rename columns, convert data types

**Key Setting**: "Keep Only Set" - drops all fields not explicitly defined

**Use Cases**:
- Remove unused columns to reduce data size
- Rename fields to standardized names
- Convert data types (string to number)
- Add calculated fields

**Best Practices**:
- Enable "Keep Only Set" to drop unused data
- Always verify output structure
- Use expressions for calculated fields

### Filter (n8n-nodes-base.filter)

**Purpose**: Remove unwanted items based on conditions

**Use Cases**:
- Remove null values
- Filter outliers before analysis
- Focus on specific data subsets

**Best Practices**:
- Filter early to reduce processing load
- Use multiple conditions when needed
- Document filter logic clearly

### IF (n8n-nodes-base.if)

**Purpose**: Branch workflow based on analysis results

**Use Cases**:
- Route anomalies vs normal data
- Trigger alerts for threshold breaches
- Create conditional outputs

**Best Practices**:
- Enable "Convert types where required" for comparisons
- Use clear condition names
- Handle both true and false branches

### Code / Function (n8n-nodes-base.function)

**Purpose**: Custom JavaScript for calculations, statistics, anomaly detection

**Use Cases**:
- Calculate statistical measures (mean, median, std dev)
- Detect outliers and anomalies
- Perform complex transformations
- Implement custom algorithms

**Best Practices**:
- Use Function node (not Function Item) for whole-dataset operations
- Return proper data structure: \`return items\`
- Add comments to explain logic
- Test with edge cases

**Note**: Consider using the newer Code node (n8n-nodes-base.code) as Function node is deprecated.

### Aggregate (n8n-nodes-base.aggregate)

**Purpose**: Group items, gather values into arrays, count occurrences by category

**Use Cases**:
- Group sales by region
- Count items by category
- Calculate sums and averages per group

**Best Practices**:
- Choose appropriate aggregation function
- Use grouping keys effectively
- Simplifies statistical calculations

### Split In Batches (n8n-nodes-base.splitInBatches)

**Purpose**: Process large datasets in chunks to prevent memory overload

**Use Cases**:
- Handle datasets with 1000+ items
- Process API results in batches
- Prevent workflow timeouts

**Best Practices**:
- Set appropriate batch size (e.g., 100 items)
- Test with realistic data volumes
- Use loop logic properly

### Merge (n8n-nodes-base.merge)

**Purpose**: Combine data from multiple sources by key/index

**Modes**:
- Merge by Key: Join data like database operations
- Merge by Index: Combine parallel data streams
- Wait mode: Synchronize parallel branches

**Use Cases**:
- Join customer data with transaction data
- Combine multiple API responses
- Enrich data from multiple sources

**Best Practices**:
- Choose correct merge mode
- Ensure matching keys exist
- Handle missing data gracefully

### Database Nodes

**MySQL** (n8n-nodes-base.mySql):
- Purpose: Query MySQL databases for analysis data
- Use cases: Fetch historical data, store results

**Postgres** (n8n-nodes-base.postgres):
- Purpose: Query PostgreSQL databases
- Use cases: Complex analytical queries, time-series data

**MongoDB** (n8n-nodes-base.mongoDb):
- Purpose: Query NoSQL document databases
- Use cases: Unstructured data analysis, JSON documents

**Best Practices**:
- Use parameterized queries for security
- Query source data efficiently with proper indexes
- Store analysis results for historical tracking
- Use appropriate data types

### Google Sheets (n8n-nodes-base.googleSheets)

**Purpose**: Read/write spreadsheet data

**Use Cases**:
- Import data for analysis
- Append summary statistics
- Build analysis logs
- Share results with stakeholders

**Best Practices**:
- Use range specifications efficiently
- Handle large sheets with batching
- Consider API rate limits

### AI Agent (@n8n/n8n-nodes-langchain.agent)

**Purpose**: Leverage AI for text analysis, sentiment detection, complex pattern recognition

**Use Cases**:
- Sentiment analysis of customer feedback
- Text classification
- Extract insights from unstructured data
- Natural language processing

**Best Practices**:
- Filter irrelevant content first to minimize tokens
- Batch data into single prompts when possible
- Use structured output for consistency
- Consider API costs and latency

### HTML (n8n-nodes-base.html)

**Purpose**: Generate formatted reports with tables and styling

**Use Cases**:
- Create analysis reports
- Build dashboards
- Color-code data quality scores
- Format tables with results

**Best Practices**:
- Use templates for consistent formatting
- Include visualizations where helpful
- Make reports mobile-friendly

### Email (n8n-nodes-base.emailSend)

**Purpose**: Send analysis reports to stakeholders automatically

**Use Cases**:
- Scheduled report delivery
- Alert notifications
- Share findings with teams

**Best Practices**:
- Use clear subject lines
- Include summary in email body
- Attach detailed reports when needed
- Schedule appropriately

## Common Pitfalls to Avoid

### Data Type Mismatches

**Problem**: JSON data types matter. Comparing string vs number yields incorrect results. The comparison "5" > "10" is lexicographically true (wrong for numbers).

**Solution**:
- Always convert data types before comparisons
- Use Number() or parseInt() for numeric operations
- Enable "Convert types where required" on IF nodes
- Validate data types early in workflow
- Use proper type casting in Code nodes

### Memory Issues with Large Datasets

**Problem**: Processing thousands of items at once can crash workflows or timeout.

**Solution**:
- Use Split In Batches node for datasets over 100 items
- Set appropriate batch sizes (50-100 items)
- Test with realistic data volumes during development
- Monitor memory usage in production
- Consider sub-workflows for complex processing

### Not Pinning Data During Development

**Problem**: Re-fetching data from APIs repeatedly wastes time and costs money during development.

**Solution**:
- Always pin data after external calls
- Test downstream logic without re-fetching
- Saves API costs and speeds development
- Use manual triggers to control execution

### Incorrect Aggregation Logic

**Problem**: Using Function Item instead of Function node for whole-dataset calculations.

**Solution**:
- Use Function node (not Function Item) for totals, averages, trends
- Function Item operates per item only
- Understand the difference between item-level and dataset-level operations
- Use Aggregate node for common operations

### Missing Data Cleaning

**Problem**: Null values, inconsistent formats, or outliers skew analysis results.

**Solution**:
- Use Filter node to remove null values
- Standardize data formats early
- Handle missing data explicitly
- Use Set node to clean and normalize fields
- Document data quality assumptions

### Poor Error Handling

**Problem**: Failed API calls or data issues break the entire workflow.

**Solution**:
- Use "Continue on Fail" setting appropriately
- Add IF nodes to check for empty datasets
- Implement error logging
- Use Error Trigger workflows for global handling
- Validate data quality before analysis

### Hardcoded Values

**Problem**: Thresholds, API endpoints, or configuration values are hardcoded in nodes.

**Solution**:
- Store configuration in environment variables
- Use Google Sheets or databases for thresholds
- Makes workflows reusable and maintainable
- Enable non-technical users to adjust parameters

### Inefficient Query Patterns

**Problem**: Fetching entire datasets when only summary data is needed.

**Solution**:
- Use database aggregation functions
- Filter data at the source
- Use appropriate indexes
- Implement pagination for large results
- Consider pre-aggregated views
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
