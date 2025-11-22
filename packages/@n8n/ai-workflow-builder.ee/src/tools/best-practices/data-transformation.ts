import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class DataTransformationBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.DATA_TRANSFORMATION;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Data Transformation

## Workflow Design

### Core Principles
- **Structure**: Always follow Input → Transform → Output pattern
- **Modularity**: Break complex workflows into sub-workflows using Execute Workflow node
- **Optimization**: Filter and reduce data early to improve performance
- **Documentation**: Use descriptive node names and sticky notes for clarity
- **Testing**: Test with edge cases (empty data, missing fields, special characters)

### Design Best Practices
- Plan transformation requirements in plain language before building
- Keep main workflows to ~5 nodes, offload details to sub-workflows
- Process inexpensive transformations first (especially data reduction)
- Use Modular Design: Create reusable sub-workflows for common tasks like "Data Cleaning" or "Error Handler"
- Batch large datasets using Split In Batches node to prevent timeouts

## Error Handling
- **Validate Early**: Use IF node at workflow start to check required fields and data types
- **Error Outputs**: Connect red error output connectors to logging/notification chains
- **Continue on Fail**: Enable in node settings to flag errors without breaking workflow
- **Global Error Workflow**: Create separate workflow with Error Trigger node as safety net
- **Logging**: Log key events with context (which record failed, error message, etc.)

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
- **Solution**: Use Set node to normalize field names before merging

#### Code Node (n8n-nodes-base.code)

**When to Use**: Complex transformations impossible with built-in nodes

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

### Workflow Orchestration

**Execute Workflow** (n8n-nodes-base.executeWorkflow):
- **Purpose**: Call sub-workflows for modular design
- **Best Practice**: Create reusable sub-workflows for common tasks like "Data Cleaning" or "Error Handler"

**Error Trigger** (n8n-nodes-base.errorTrigger):
- **Purpose**: Create global error handling workflow
- **Best Practice**: Use as safety net to catch all workflow errors

## Common Pitfalls to Avoid

### Critical Mistakes

#### Set Node Issues
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
- **Missing Keys**: Trying to merge on non-existent fields
- **Fix**: Validate both inputs have matching key fields
- **Field Name Mismatch**: Different field names in sources
- **Fix**: Use Set node to normalize field names before merging

### General Workflow Issues
- **No Error Handling**: Workflow crashes on unexpected data
- **Fix**: Add IF nodes for validation, use error outputs
- **Hard-coded Values**: URLs, credentials, config in nodes
- **Fix**: Use environment variables or config nodes
- **Poor Naming**: Generic names like "Set1", "Function1"
- **Fix**: Use descriptive names: "Clean Customer Data", "Calculate Totals"
- **Missing Documentation**: No comments or descriptions
- **Fix**: Add sticky notes, node descriptions, code comments

### Performance Pitfalls
- Processing large datasets without batching → timeouts
- Not filtering early → unnecessary processing overhead
- Excessive node chaining → visual clutter and slow execution
- Not using sub-workflows → unmaintainable monolithic workflows

### Data Validation Pitfalls
- Assuming input data is always perfect
- Not handling empty/null values
- Ignoring data type mismatches
- Missing edge case handling (special characters, empty arrays)
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
