import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class FormInputBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.FORM_INPUT;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Form Input Workflows

## Workflow Design

### Critical: Always Store Raw Form Data

ALWAYS store raw form responses to a persistent data storage destination even if the primary purpose of the workflow is
to trigger another action (like sending to an API or triggering a notification). This allows users to monitor
form responses as part of the administration of their workflow.

Required storage destinations include:
- Google Sheets node
- Airtable node
- n8n Data Tables
- PostgreSQL/MySQL/MongoDB nodes
- Any other database or spreadsheet service

IMPORTANT: Simply using Set or Merge nodes is NOT sufficient. These nodes only transform data in memory - they do not
persist data. You must use an actual storage node (like Google Sheets, Airtable, or Data Tables) to write the data.

Storage Requirements:
- Store the un-edited user input immediately after the form steps are complete
- Do not store only a summary or edited version of the user's inputs - store the raw data
- For single-step forms: store immediately after the form trigger
- For multi-step forms: store immediately after aggregating all steps with Set/Merge nodes
- The storage node should appear in the workflow right after data collection/aggregation

## Message Attribution

n8n forms attach the attribution "n8n workflow" to messages by default - you must disable this setting which will
often be called "Append n8n Attribution" for the n8n form nodes, add this setting and set it to false.

## Multi-Step Forms

Build multi-step forms by chaining multiple Form nodes together. Each Form node represents a page or step in your form
sequence. Use the n8n Form Trigger node to start the workflow and display the first form page to the user.

## Data Collection & Aggregation

Collect and merge all user responses from each form step before writing to your destination (e.g., Data Table). Use
Set or Merge nodes to combine data as needed. Make sure your JSON keys match the column names in your destination for
automatic mapping.

## Conditional Logic & Branching

Use IF or Switch nodes to direct users to different form pages based on their previous answers. This enables dynamic
form flows where the path changes based on user input, creating personalized form experiences.

## Dynamic Form Fields

For forms that require dynamic options (e.g., dropdowns populated from an API or previous step), generate the form
definition in a Code node and pass it to the Form node as JSON. You can define forms using JSON for dynamic or
conditional fields, and even generate form fields dynamically using a Code node if needed.

## Input Validation

Validate user input between steps to ensure data quality. If input is invalid, loop back to the relevant form step with
an error message to guide the user to correct their submission. This prevents bad data from entering your system.

## Recommended Nodes

### n8n Form Trigger (n8n-nodes-base.formTrigger)

Purpose: Starts the workflow and displays the first form page to the user

Pitfalls:

- Use the Production URL for live forms; the Test URL is for development and debugging only
- Ensure the form trigger is properly configured before sharing URLs with users

### n8n Form (n8n-nodes-base.form)

Purpose: Displays form pages in multi-step form sequences

Pitfalls:

- Each Form node represents one page/step in your form
- You can define forms using JSON for dynamic or conditional fields
- Generate form fields dynamically using a Code node if needed for complex scenarios

### Storage Nodes

Purpose: Persist raw form data to a storage destination, preference should be for built-in n8n tables
but use the most applicable node depending on the user's request.

Required nodes (use at least one):
- Data table (n8n-nodes-base.dataTable): Built-in n8n storage for quick setup - preferred
- Google Sheets (n8n-nodes-base.googleSheets): Best for simple spreadsheet storage
- Airtable (n8n-nodes-base.airtable): Best for structured database with relationships
- Postgres (n8n-nodes-base.postgres) / MySQL (n8n-nodes-base.mySql) / MongoDB (n8n-nodes-base.mongoDb): For production database storage

Pitfalls:

- Every form workflow MUST include a storage node that actually writes data to a destination
- Set and Merge nodes alone are NOT sufficient - they only transform data in memory
- The storage node should be placed immediately after the form trigger (single-step) or after data aggregation (multi-step)

### Code (n8n-nodes-base.code)

Purpose: Processes form data, generates dynamic form definitions, or implements custom validation logic

### Edit Fields (Set) (n8n-nodes-base.set)

Purpose: Aggregates and transforms form data between steps (NOT for storage - use a storage node)

### Merge (n8n-nodes-base.merge)

Purpose: Combines data from multiple form steps into a single dataset (NOT for storage - use a storage node)

Pitfalls:

- Ensure data from all form steps is properly merged before writing to destination
- Use appropriate merge modes (append, merge by key, etc.) for your use case
- Remember: Merge prepares data but does not store it - add a storage node after Merge

### If (n8n-nodes-base.if)

Purpose: Routes users to different form pages based on their previous answers

### Switch (n8n-nodes-base.switch)

Purpose: Implements multi-path conditional routing in complex forms

Pitfalls:

- Include a default case to handle unexpected input values
- Keep routing logic clear and maintainable

## Common Pitfalls to Avoid

### Missing Raw Form Response Storage

When building n8n forms it is recommended to always store the raw form response to some form of data storage (Googlesheets, Airtable, etc)
for administration later. It is CRITICAL if you create a n8n form node that you store the raw output with a storage node.

### Data Loss in Multi-Step Forms

Aggregate all form step data using Set/Merge nodes before writing to your destination. Failing to merge data from multiple steps
can result in incomplete form submissions being stored. After merging, ensure you write the complete dataset to a storage node.

### Poor User Experience

Use the Form Ending page type to show a completion message or redirect users after submission.
Without a proper ending, users may be confused about whether their submission was successful.

### Invalid Data

Implement validation between form steps to catch errors early. Without validation, invalid data can
propagate through your workflow and corrupt your destination data.

### Complex Field Generation

When generating dynamic form fields, ensure the JSON structure exactly matches what the Form
node expects. Test thoroughly with the Test URL before going live.

### Mapping Errors

When writing to Google Sheets or other destinations, ensure field names match exactly. Mismatched names
will cause data to be written to wrong columns or fail entirely.
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
