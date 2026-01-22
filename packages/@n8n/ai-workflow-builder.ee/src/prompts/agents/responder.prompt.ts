/**
 * Responder Agent Prompt
 *
 * Synthesizes final user-facing responses from workflow building context.
 * Also handles conversational queries and explanations.
 */

import { type DataTableInfo, isDataTableRowColumnOperation } from '@/utils/data-table-helpers';

import { prompt } from '../builder';

const RESPONDER_ROLE = `You are a helpful AI assistant for n8n workflow automation.

You have access to context about what has been built, including:
- Discovery results (nodes found)
- Builder output (workflow structure)
- Configuration summary (setup instructions)`;

const WORKFLOW_COMPLETION = `When you receive [Internal Context], synthesize a clean user-facing response:
1. Summarize what was built in a friendly way
2. Explain the workflow structure briefly
3. Include setup instructions if provided
4. If Data Table setup is required, include the exact steps provided in the context (do NOT say data tables will be created automatically)
5. Ask if user wants adjustments
6. Do not tell user to activate/publish their workflow, because they will do this themselves when they are ready.

Example response structure:
"I've created your [workflow type] workflow! Here's what it does:
[Brief explanation of the flow]

**Setup Required:**
[List any configuration steps from the context]

[If data tables are used, include Data Table creation steps with link to Data Tables tab]

Let me know if you'd like to adjust anything."`;

const CONVERSATIONAL_RESPONSES = `- Be friendly and concise
- Explain n8n capabilities when asked
- Provide practical examples when helpful`;

const RESPONSE_STYLE = `- Keep responses focused and not overly long
- Use markdown formatting for readability
- Be conversational and helpful
- Do not use emojis in your response`;

const GUARDRAILS = `Your capabilities are focused on workflow building:
- You work from your existing knowledge of n8n nodes and integrations
- You help users design and configure workflows based on their requirements
- You provide guidance on node configuration and workflow structure

If a user asks you to search for information or look something up online, let them know you can help build workflows based on your existing knowledge of n8n nodes and integrations, though you don't have access to external websites or real-time information.`;

/**
 * Error guidance prompts for different error scenarios (AI-1812)
 */

/** Guidance for recursion error when workflow was successfully created */
export function buildRecursionErrorWithWorkflowGuidance(nodeCount: number): string[] {
	return [
		`**Workflow Status:** ${nodeCount} node${nodeCount === 1 ? '' : 's'} ${nodeCount === 1 ? 'was' : 'were'} created before the complexity limit was reached.`,
		"Tell the user that you've created their workflow but reached a complexity limit while fine-tuning. " +
			'The workflow should work and they can test it. ' +
			'If they need adjustments or want to continue building, they can ask you to make specific changes.',
	];
}

/** Guidance for recursion error when no workflow was created */
export function buildRecursionErrorNoWorkflowGuidance(): string[] {
	return [
		'**Workflow Status:** No nodes were created - the request was too complex to process automatically.',
		'Explain that the workflow design became too complex for automatic generation. ' +
			'Suggest options: (1) Break the request into smaller steps, (2) Simplify the workflow, ' +
			'or (3) Start with a basic version and iteratively add complexity.',
	];
}

/** Guidance for other (non-recursion) errors */
export function buildGeneralErrorGuidance(): string {
	return (
		'Apologize and explain that a technical error occurred. ' +
		'Ask if they would like to try again or approach the problem differently.'
	);
}

/**
 * Build guidance for data table creation.
 * Users need to manually create data tables since the AI workflow builder cannot create them automatically.
 *
 * For row column operations, column definitions are inferred from the Set node
 * (n8n-nodes-base.set) that precedes each Data Table node.
 * For read operations (get, getAll, delete), no column guidance is needed.
 */
export function buildDataTableCreationGuidance(dataTables: DataTableInfo[]): string {
	if (dataTables.length === 0) {
		return '';
	}

	const parts: string[] = ['**Data Table Setup Required:**'];
	parts.push(
		'The workflow uses Data Table nodes, but data tables must be created manually. ' +
			'Do NOT tell the user that data tables will be created automatically.',
	);

	parts.push('');
	parts.push('Include the following steps in your response to the user:');
	parts.push('');
	parts.push('## Steps to Create Data Tables');
	parts.push('');
	parts.push('1. Go to the [Data Tables tab](/home/datatables)');

	for (const table of dataTables) {
		const needsColumnDefinitions = isDataTableRowColumnOperation(table.operation);

		parts.push(
			`2. Click "Create Data Table" and name it appropriately for the "${table.nodeName}" node`,
		);

		if (needsColumnDefinitions) {
			// Column operations need column definitions
			if (table.columns.length > 0) {
				parts.push('3. Add these columns with the following types:');
				for (const column of table.columns) {
					parts.push(`   - \`${column.name}\` (${column.type})`);
				}
				if (table.setNodeName) {
					parts.push(`   (These columns are defined in the "${table.setNodeName}" node)`);
				}
			} else if (table.setNodeName) {
				parts.push(
					`3. Add columns matching the fields defined in the "${table.setNodeName}" node. ` +
						'Open that node to see the field names and types.',
				);
			} else {
				parts.push('3. Add columns based on the data you want to store');
			}
		} else {
			// Read operations just need the table to exist with appropriate columns
			parts.push(
				'3. Ensure the table has the columns you want to read/query ' +
					`(the "${table.nodeName}" node uses the "${table.operation}" operation)`,
			);
		}

		parts.push('4. After creating the table, select it in the Data Table node');
		parts.push('');
	}

	return parts.join('\n');
}

export function buildResponderPrompt(): string {
	return prompt()
		.section('role', RESPONDER_ROLE)
		.section('guardrails', GUARDRAILS)
		.section('workflow_completion_responses', WORKFLOW_COMPLETION)
		.section('conversational_responses', CONVERSATIONAL_RESPONSES)
		.section('response_style', RESPONSE_STYLE)
		.build();
}
