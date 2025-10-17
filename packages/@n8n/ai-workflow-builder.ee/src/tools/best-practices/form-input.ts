import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class FormInputBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.FORM_INPUT;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Form Input Workflows

## Multi-Step Forms

Build multi-step forms by chaining multiple Form nodes together. Each Form node represents a page or step in your form
sequence. Use the n8n Form Trigger node to start the workflow and display the first form page to the user.

## Data Collection & Aggregation

Collect and merge all user responses from each form step before writing to your destination (e.g., Google Sheets). Use
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

### n8n Form Trigger

Purpose: Starts the workflow and displays the first form page to the user

Pitfalls:

- Use the Production URL for live forms; the Test URL is for development and debugging only
- Ensure the form trigger is properly configured before sharing URLs with users

### n8n Form

Purpose: Displays form pages in multi-step form sequences

Pitfalls:

- Each Form node represents one page/step in your form
- You can define forms using JSON for dynamic or conditional fields
- Generate form fields dynamically using a Code node if needed for complex scenarios

### Code

Purpose: Processes form data, generates dynamic form definitions, or implements custom validation logic

### Set

Purpose: Aggregates and transforms form data between steps

Pitfalls:

- Make sure JSON keys match destination column names for automatic mapping
- Use Set nodes to clean and prepare data before final storage

### Merge

Purpose: Combines data from multiple form steps into a single dataset

Pitfalls:

- Ensure data from all form steps is properly merged before writing to destination
- Use appropriate merge modes (append, merge by key, etc.) for your use case

### IF

Purpose: Routes users to different form pages based on their previous answers

### Switch

Purpose: Implements multi-path conditional routing in complex forms

Pitfalls:

- Include a default case to handle unexpected input values
- Keep routing logic clear and maintainable

## Common Pitfalls to Avoid

Data Loss: Aggregate all form step data before writing to your destination. Failing to merge data from multiple steps
can result in incomplete form submissions being stored.

Poor User Experience: Use the Form Ending page type to show a completion message or redirect users after submission.
Without a proper ending, users may be confused about whether their submission was successful.

Invalid Data: Implement validation between form steps to catch errors early. Without validation, invalid data can
propagate through your workflow and corrupt your destination data.

Complex Field Generation: When generating dynamic form fields, ensure the JSON structure exactly matches what the Form
node expects. Test thoroughly with the Test URL before going live.

Mapping Errors: When writing to Google Sheets or other destinations, ensure field names match exactly. Mismatched names
will cause data to be written to wrong columns or fail entirely.
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
