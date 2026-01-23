import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class DataTransformationBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.DATA_TRANSFORMATION;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Data Transformation

## Workflow Design

### Core Principles
- **Structure**: Always follow Input → Transform → Output pattern
- **Optimization**: Filter and reduce data early to improve performance

### Design Best Practices
- Plan transformation requirements in plain language before building
- Use Modular Design: Create reusable sub-workflows for common tasks like "Data Cleaning" or "Error Handler"
- Batch datasets over 100 items using Split In Batches node to prevent timeouts

## Recommended Nodes

### Essential Transformation Nodes

#### Edit Fields (Set) (n8n-nodes-base.set)

**Purpose**: Create, modify, rename fields; change data types

**Key Setting**: "Keep Only Set" - drops all fields not explicitly defined (default: disabled)

**Use Cases**:
- Extract specific columns
- Add calculated fields
- Convert data types (string to number)
- Format dates using expressions

**Pitfalls**:
- Not understanding "Keep Only Set" behavior can lead to data loss
- Enabled: Drops all fields not explicitly defined (data loss risk)
- Disabled: Carries forward all fields (potential bloat)
- Always verify output structure after configuration

**Testing tip**: When transforming data from a workflow trigger, you can set values with a fallback default e.g. set name to {{$json.name || 'Jane Doe'}} to help test the workflow.

#### IF/Filter Nodes

**IF Node** (n8n-nodes-base.if):
- **Purpose**: Conditional processing and routing
- **Best Practice**: Use early to validate inputs and remove bad data
- **Example**: Check if required fields exist before processing

**Filter Node** (n8n-nodes-base.filter):
- **Purpose**: Filter items based on conditions
- **Best Practice**: Use early in workflow to reduce data volume

#### Merge Node (n8n-nodes-base.merge)

**Purpose**: Combine two data streams

**Modes**:
- Merge by Key (like database join)
- Merge by Index
- Append

**Pitfalls**:
- **Missing Keys**: Trying to merge on non-existent fields
- **Field Name Mismatch**: Different field names in sources
- **Solution**: Use Edit Fields node to normalize field names before merging

#### Code Node (n8n-nodes-base.code)

**Execution Modes**:
- "Run Once per Item": Process each item independently
- "Run Once for All Items": Access entire dataset (for aggregation)

**Return Format**: Must return array of objects with json property
\`\`\`javascript
return items; // or return [{ json: {...} }];
\`\`\`

**Pitfalls**:
- Wrong return format: Not returning array of objects with json property
- Overly complex: Stuffing entire workflow logic in one Code node
- Keep code nodes focused on single transformation aspect

#### Summarize Node (n8n-nodes-base.summarize)

**Purpose**: Pivot table-style aggregations (count, sum, average, min/max)

**Configuration**:
- Fields to Summarize: Choose aggregation function
- Fields to Split By: Grouping keys

**Output**: Single item with summary or multiple items per group

### Data Restructuring Nodes

- **Split Out** (n8n-nodes-base.splitOut): Convert single item with array into multiple items
- **Aggregate** (n8n-nodes-base.aggregate): Combine multiple items into one
- **Remove Duplicates** (n8n-nodes-base.removeDuplicates): Delete duplicate items based on field criteria
- **Sort** (n8n-nodes-base.sort): Order items alphabetically/numerically
- **Limit** (n8n-nodes-base.limit): Trim to maximum number of items

### Batch Processing

**Split In Batches** (n8n-nodes-base.splitInBatches):
- **Purpose**: Process large datasets in chunks
- **Use When**: Handling 100+ items with expensive operations (API calls, AI)

## Input Data Validation
- Validate external data before processing: check for nulls, empty values, and edge cases (special chars, empty arrays)

## Common Pitfalls to Avoid

### Critical Mistakes

#### Edit Fields Node Issues
- **Mistake**: Not understanding "Keep Only Set" behavior
  - Enabled: Drops all fields not explicitly defined (data loss risk)
  - Disabled: Carries forward all fields (potential bloat)
- **Solution**: Always verify output structure after configuration

#### Code Node Errors
- **Wrong Return Format**: Not returning array of objects with json property
- **Fix**: Always return \`items\` or \`[{ json: {...} }]\`
- **Overly Complex**: Stuffing entire workflow logic in one Code node
- **Fix**: Keep code nodes focused on single transformation aspect

#### Merge Node Problems
- **Field Name Mismatch**: Different field names in sources
- **Fix**: Normalize field names with Edit Fields before merging

### Performance Pitfalls
- Processing large datasets without batching → timeouts
- Not filtering early → unnecessary processing overhead
- Excessive node chaining → visual clutter and slow execution

### Data Validation Pitfalls
- Assuming input data is always perfect → runtime errors
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
