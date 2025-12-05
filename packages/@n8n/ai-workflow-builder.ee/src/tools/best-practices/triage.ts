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
4. **Routing**: Direct items to appropriate branches using Switch node
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
- Set low temperature (0-0.2) for consistency
- Include few-shot examples for accuracy
- Implement error handling for unexpected outputs

## Routing & Branching

Use Switch node as primary traffic controller:
- Configure cases for each classification value
- Always define Default case for unexpected values
- Each item follows exactly one branch
- Keep branches modular using Execute Workflow node for complex logic

Avoid parallel IF nodes that could match multiple conditions - use Switch or chain IF nodes with Execute Once setting.

## Recommended Nodes

### Trigger Nodes

**Webhook** (n8n-nodes-base.webhook):
- Purpose: Capture incoming items for triage via HTTP requests
- Best for: Form submissions, webhook integrations

**Gmail Trigger** (n8n-nodes-base.gmailTrigger):
- Purpose: Automatically process new emails
- Best for: Email-based triage workflows

**Schedule Trigger** (n8n-nodes-base.scheduleTrigger):
- Purpose: Periodic batch processing of items
- Best for: Regular review of database records or API data

### Classification Nodes

**IF** (n8n-nodes-base.if):
- Purpose: Simple binary decisions
- Use when: Two-way branching based on conditions
- Example: Check if priority field equals "high"

**Switch** (n8n-nodes-base.switch):
- Purpose: Multi-way branching based on field values
- Use when: Multiple categories (3+ outcomes)
- CRITICAL: Always configure Default output for unmatched items

**OpenAI** (@n8n/n8n-nodes-langchain.openAi):
- Purpose: AI-powered text classification
- Best practices:
  - Use structured output format
  - Set low temperature (0-0.2) for consistency
  - Include few-shot examples

**AI Agent** (@n8n/n8n-nodes-langchain.agent):
- Purpose: Complex classification requiring multiple steps or tool use
- Use when: Classification needs context lookup or multi-step reasoning

### Data Processing

**Set** (n8n-nodes-base.set):
- Purpose: Normalize fields, add metadata, store classification results
- Use early: Standardize incoming data structure

**Function** (n8n-nodes-base.function):
- Purpose: Custom classification logic using JavaScript
- Use when: Complex rules that can't be expressed in IF/Switch

**HTTP Request** (n8n-nodes-base.httpRequest):
- Purpose: Fetch additional context (CRM data, user history)
- Use before: Classification to enrich decision context

### Integration & Action Nodes

**Slack** (n8n-nodes-base.slack):
- Purpose: Send notifications, create channels by category
- Example: Alert #urgent-tickets channel for high-priority items

**HubSpot** (n8n-nodes-base.hubspot):
- Purpose: Update contact records, create tasks, set lead scores
- Example: Tag contacts based on classification

**JIRA** (n8n-nodes-base.jira):
- Purpose: Create issues with appropriate priority/assignee
- Example: Auto-assign bugs to engineering team

**Database Nodes**:
- Postgres (n8n-nodes-base.postgres)
- MySQL (n8n-nodes-base.mySql)
- MongoDB (n8n-nodes-base.mongoDb)

Purpose: Log triage outcomes, track metrics, store classification history

**Google Sheets** (n8n-nodes-base.googleSheets):
- Purpose: Simple logging and reporting
- Example: Track daily triage volumes by category

### Workflow Control

**Execute Workflow** (n8n-nodes-base.executeWorkflow):
- Purpose: Modular branch logic
- Use when: Category-specific actions are complex
- Pattern: Switch → Execute Workflow (per category)

**Error Trigger** (n8n-nodes-base.errorTrigger):
- Purpose: Catch and handle classification failures
- CRITICAL: Always implement for production triage workflows

**Merge** (n8n-nodes-base.merge):
- Purpose: Consolidate branches for unified logging
- Use after: Category-specific actions before final logging step

## Common Pitfalls to Avoid

### No Default Path
**Problem**: Every Switch must have a Default output. Unmatched items should go to manual review or logging, never drop silently.

**Solution**: Always configure Default case to route unclassified items to a fallback action (e.g., manual review queue, admin notification)

### Overlapping Conditions
**Problem**: Categories must be mutually exclusive. Items matching multiple conditions cause unpredictable routing.

**Solution**:
- Order checks from most specific to general
- Use Switch with distinct values instead of multiple IF nodes
- Test edge cases thoroughly

### Costly API Overuse
**Problem**: Calling AI APIs multiple times for same item wastes resources.

**Solution**:
- Use pin data feature during development
- Classify each item only once, store result in variable for reuse
- Enable caching where available
- Batch similar items when possible

### Missing Error Handling
**Problem**: AI calls can fail or return unexpected formats, breaking the workflow.

**Solution**:
- Implement Error Trigger workflow to catch failures
- Add validation after AI classification
- Handle unexpected outputs gracefully with default categorization
- Log all errors for review

### Poor Documentation
**Problem**: Generic node names make workflows hard to maintain.

**Solution**:
- Name nodes clearly (e.g., "Classify with OpenAI", "Route by Priority")
- Use Sticky Notes for complex sections
- Store constants in Set nodes or environment variables
- Document classification criteria

### Relying 100% on AI
**Problem**: AI can misclassify critical items, leading to wrong actions.

**Solution**:
- For critical decisions, combine AI with rule validation
- Monitor accuracy metrics
- Implement human verification for high-risk categories
- Use confidence thresholds to route uncertain items to manual review

### No Monitoring
**Problem**: Can't track accuracy, volume trends, or system health.

**Solution**:
- Log all triage outcomes to database/sheets
- Track metrics: category volumes, error rates, processing times
- Set up alerts for anomalies (e.g., sudden spike in unclassified items)
- Review misclassifications regularly to improve rules/prompts
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
