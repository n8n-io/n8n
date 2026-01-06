import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class DataPersistenceBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.DATA_PERSISTENCE;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Data Persistence

## Overview

Data persistence involves storing, updating, or retrieving records from durable storage systems. This technique is essential when you need to maintain data beyond the lifetime of a single workflow execution, or when you need to access existing data that users have stored in their spreadsheets, tables, or databases as part of your workflow logic.

## When to Use Data Persistence

Use data persistence when you need to:
- Store workflow results for later retrieval or audit trails
- Maintain records that multiple workflows can access and update
- Create a centralized data repository for your automation
- Archive historical data for reporting or compliance
- Build data that persists across workflow executions
- Track changes or maintain state over time
- Store raw form inputs

## Choosing the Right Storage Node

### Data Table (n8n-nodes-base.dataTable) - PREFERRED

**Best for:** Quick setup, small to medium amounts of data

Advantages:
- No credentials or external configuration required
- Built directly into n8n
- Fast and reliable for small to medium datasets
- Ideal for prototyping and internal workflows
- No additional costs or external dependencies

When to use:
- Internal workflow data storage
- Temporary or staging data
- Admin/audit trails
- Simple record keeping
- Development and testing

### Google Sheets (n8n-nodes-base.googleSheets)

**Best for:** Collaboration, reporting, easy data sharing

Advantages:
- Familiar spreadsheet interface for non-technical users
- Easy to share and collaborate on data
- Built-in visualization and formula capabilities
- Good for reporting and dashboards
- Accessible from anywhere

When to use:
- Data needs to be viewed/edited by multiple people
- Non-technical users need access to data
- Integration with other Google Workspace tools
- Simple data structures without complex relationships
- Workflow needs access to existing spreadsheets in Google Sheets

Pitfalls:
- API rate limits can affect high-volume workflows
- Not suitable for frequently changing data
- Performance degrades with very large datasets (>10k rows)

### Airtable (n8n-nodes-base.airtable)

**Best for:** Structured data with relationships, rich field types

Advantages:
- Supports relationships between tables
- Rich field types (attachments, select, links, etc.)
- Better structure than spreadsheets

When to use:
- Data has relationships or references between records
- Need structured database-like features
- Managing projects, tasks, or inventory
- Workflow needs access to existing data in Airtable

Pitfalls:
- Requires Airtable account and API key
- Schema changes require careful planning

## Storage Patterns

### Immediate Storage Pattern

Store data immediately after collection or generation:

\`\`\`mermaid
flowchart LR
    Trigger --> Process_Data["Process Data"]
    Process_Data --> Storage_Node["Storage Node"]
    Storage_Node --> Continue_Workflow["Continue Workflow"]
\`\`\`

Best for: Raw data preservation, audit trails, form submissions

### Batch Storage Pattern

Collect multiple items and store them together:

\`\`\`mermaid
flowchart LR
    Trigger --> Loop_Split["Loop/Split"]
    Loop_Split --> Process["Process"]
    Process --> Aggregate["Aggregate"]
    Aggregate --> Storage_Node["Storage Node"]
\`\`\`

Best for: Processing lists, batch operations, scheduled aggregations

### Update Pattern

Retrieve, modify, and update existing records:

\`\`\`mermaid
flowchart LR
    Trigger --> Retrieve["Retrieve from Storage"]
    Retrieve --> Modify["Modify"]
    Modify --> Update_Storage["Update Storage Node"]
\`\`\`

Best for: Maintaining state, updating records, tracking changes

### Lookup Pattern

Query storage to retrieve specific records:

\`\`\`mermaid
flowchart LR
    Trigger --> Query_Storage["Query Storage Node"]
    Query_Storage --> Use_Data["Use Retrieved Data"]
    Use_Data --> Continue_Workflow["Continue Workflow"]
\`\`\`

Best for: Enrichment, validation, conditional logic based on stored data

## Key Considerations

### Data Structure

- **Plan your schema ahead:** Define what fields you need before creating storage
- **Use consistent field names:** Match field names across your workflow for easy mapping
- **Consider data types:** Ensure your storage supports the data types you need
- **Think about relationships:** If data is related, consider Airtable or use multiple tables

### Performance

- **Batch operations when possible:** Multiple small writes are slower than batch operations
- **Use appropriate operations:** Use "append" for new records, "update" for modifications
- **Consider API limits:** Google Sheets has rate limits; plan accordingly for high-volume workflows

### Data Integrity

- **Store raw data first:** Keep unmodified input before transformations
- **Handle errors gracefully:** Use error handling to prevent data loss on failures
- **Validate before storing:** Ensure data quality before persistence
- **Avoid duplicates:** Use unique identifiers or upsert operations when appropriate

## Important Distinctions

### Storage vs. Transformation

- **Set/Merge nodes are NOT storage:** They transform data in memory only
- **Storage happens explicitly:** Data won't persist unless you explicitly write it to storage

### Temporary vs. Persistent Storage

- **NOT covered by this technique:** Redis, caching, session storage, in-memory operations
- **This technique covers:** Durable storage that persists beyond workflow execution
- **Focus on permanence:** Use these nodes when you need data to survive restarts and be queryable later

## Common Pitfalls to Avoid

### Not Handling Duplicates

Without proper unique identifiers or upsert logic, you may create duplicate records. Use unique IDs or check for existing records before inserting.

### Ignoring Storage Limits

Each storage system has limits (row counts, API rates, file sizes). Design your workflow to work within these constraints or implement pagination/batching.
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
