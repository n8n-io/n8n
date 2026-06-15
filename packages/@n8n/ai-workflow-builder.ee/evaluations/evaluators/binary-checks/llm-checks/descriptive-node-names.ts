import { createLlmCheck } from './create-llm-check';

export const descriptiveNodeNames = createLlmCheck({
	name: 'descriptive_node_names',
	systemPrompt: `You are an evaluator checking whether n8n workflow nodes have meaningful, descriptive names.
Check:
- Are node names descriptive of their purpose (e.g., "Send Welcome Email" vs "HTTP Request")?
- Do names avoid default/generic names like "HTTP Request", "Code", "Set", "IF"?
- Are names specific enough to understand the workflow at a glance?

Note: Trigger nodes commonly keep their default names (e.g., "When clicking 'Test workflow'"), which is acceptable.
A few default names in a simple workflow is acceptable; the check is about overall naming quality.

Respond with pass: true if node names are generally descriptive and meaningful, false otherwise.
Provide clear reasoning for your decision.`,
	humanTemplate: `User Request: {userPrompt}

Generated Workflow:
{generatedWorkflow}

{referenceSection}

Do the nodes in this workflow have descriptive, meaningful names?`,
});
