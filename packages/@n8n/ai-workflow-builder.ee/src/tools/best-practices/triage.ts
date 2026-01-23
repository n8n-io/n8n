import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class TriageBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.TRIAGE;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Triage Workflows

## Workflow Design

Triage workflows automatically classify incoming data and route it based on priority or category. Common use cases include sorting support tickets by urgency, categorizing emails for follow-up, or scoring leads for sales routing.

Define clear categories and outcomes before building. Design in logical stages:

1. **Trigger & Input**: Capture incoming items (webhook, email trigger, form submission, schedule)
2. **Preprocessing**: Fetch additional data if needed (CRM lookup, field normalization)
3. **Classification**: Assign categories via rules or AI
4. **Routing**: Direct items to appropriate branches using Switch node or Text Classifier Node
5. **Actions**: Execute category-specific tasks (create tasks, send alerts, update records)
6. **Logging**: Track outcomes for monitoring and analysis

CRITICAL: Always include a default/fallback path to catch unclassified items. Never allow data to drop silently.

## Classification Strategies

### Rule-Based Classification
Use IF/Switch nodes for keyword detection, sender addresses, or numeric thresholds. Chain multiple conditions or use Switch for multi-way branching.

Example: IF email contains "urgent" → High Priority branch

### AI-Powered Classification
For unstructured text or nuanced decisions, use AI nodes with clear prompts and defined output labels.

Example prompt: "Classify this email as INTERESTED, NOT_INTERESTED, or QUESTION"

Best practices:
- Use structured output format (JSON with specific fields)
- Set low temperature parameter of the model (0-0.2) for consistency
- Include few-shot examples of input + classification
- Implement error handling for unexpected outputs

#### Text Classifier Node
Use the Text Classifier node (@n8n/n8n-nodes-langchain.textClassifier) for straightforward text classification tasks. Configure with predefined category labels and descriptions for accurate results.

Example workflow pattern:
\`\`\`mermaid
flowchart LR
    A[Webhook Trigger] --> B[Set: Normalize Data]
    B --> C[Text Classifier]
    C --> D{Switch: Route by Category}
    D -->|High Priority| E[Slack: Alert Team]
    D -->|Medium Priority| F[Create Task]
    D -->|Low Priority| G[Log to Sheet]
    D -->|Default| H[Manual Review]
\`\`\`

### Combined Approach
For robust triage, combine rule-based and AI classification. Use AI Agent node with structured output to assign categories, scores, or tags, then route with Switch nodes.
When using AI with structured output, always add reasoning field alongside category or score to aid debugging.

Example workflow pattern:
\`\`\`mermaid
flowchart LR
    A[Email Trigger] --> B[Set: Extract Fields]
    B --> C{IF: Contains Keywords}
    C -->|Yes| D[Set: Rule-based Category]
    C -->|No| E[AI Agent: Classify with Structured Output]
    D --> F[Merge]
    E --> F
    F --> G{Switch: Route by Category}
    G -->|Category A| H[Action A]
    G -->|Category B| I[Action B]
    G -->|Default| J[Manual Review]
\`\`\`

**Structured Output Schema Example:**
\`\`\`json
{
  "category": "INTERESTED | NOT_INTERESTED | QUESTION",
  "confidence": 0.95,
  "reasoning": "Customer asked about pricing and availability"
}
\`\`\`

## Routing & Branching

Use Switch node as primary traffic controller:
- Configure cases for each classification value
- Always define Default case for unexpected values
- Each item follows exactly one branch

Avoid parallel IF nodes that could match multiple conditions - use Switch node.

## Recommended Nodes

**IF** (n8n-nodes-base.if):
- Purpose: Simple binary decisions
- Use when: Two-way branching based on conditions
- Example: Check if priority field equals "high"

**Switch** (n8n-nodes-base.switch):
- Purpose: Multi-way branching based on field values
- Use when: Multiple categories (3+ outcomes)
- CRITICAL: Always configure Default output for unmatched items

**Merge** (n8n-nodes-base.merge):
- Purpose: Consolidate branches for unified logging
- Use after: Category-specific actions before final logging step

**Text Classifier** (@n8n/n8n-nodes-langchain.textClassifier):
- Purpose: AI-powered text classification with predefined labels
- Use when: Need to assign categories to unstructured text
- CRITICAL: Always configure "When No Clear Match" option to output items to "Other" branch

**AI Agent** (@n8n/n8n-nodes-langchain.agent):
- Purpose: Complex classification or scoring requiring multiple steps or tool use
- Use when: Classification needs context lookup, multi-step reasoning with tools, numerical scoring or other complex outputs
- CRITICAL: Always use structured output format (JSON schema)

**IMPORTANT**: For all AI nodes (Text Classifier, AI Agent):
	- Set low temperature of the model (0-0.2) for consistency
	- Include few-shot examples in prompts

## Common Pitfalls to Avoid

### No Default Path
**Problem**: Every Switch must have a Default output. Unmatched items should go to manual review or logging, never drop silently.

**Solution**: Always configure Default case to route unclassified items to a fallback action (e.g., manual review queue, admin notification)

### No "Other" Branch in Text Classifier
**Problem**: Items that don't match any category get dropped if "When No Clear Match" isn't set.

**Solution**: In Text Classifier node, set "When No Clear Match" to "Output on Extra, 'Other' Branch" to capture unmatched items.

### Overlapping Conditions
**Problem**: Categories must be mutually exclusive. Items matching multiple conditions cause unpredictable routing.

**Solution**:
- Order checks from most specific to general
- Use Switch with distinct values instead of multiple IF nodes
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
