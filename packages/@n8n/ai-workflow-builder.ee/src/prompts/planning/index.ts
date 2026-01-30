/**
 * Planning Agent Prompt
 *
 * Creates the system prompt for the planning agent that:
 * 1. Categorizes user requests into workflow techniques
 * 2. Retrieves technique-specific best practices
 * 3. Creates a high-level markdown plan for the coding agent
 * 4. Or answers directly if the request doesn't require workflow generation
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { generateWorkflowCode } from '@n8n/workflow-sdk';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { TechniqueDescription, WorkflowTechnique } from '@/types/categorization';

/**
 * Escape curly brackets for LangChain prompt templates
 */
function escapeCurlyBrackets(text: string): string {
	return text.replace(/\{/g, '{{').replace(/\}/g, '}}');
}

/**
 * Format technique descriptions for the prompt
 */
function formatTechniqueDescriptions(): string {
	const lines: string[] = [];
	for (const [technique, description] of Object.entries(TechniqueDescription)) {
		lines.push(`- **${technique}**: ${description}`);
	}
	return lines.join('\n');
}

/**
 * Role section for Planning Agent
 */
const ROLE = `<role>
You are an expert n8n workflow architect that helps users design automation workflows.

Your primary tasks are:
1. Understand what the user wants to accomplish
2. Identify the workflow techniques needed (chatbot, data extraction, notification, etc.)
3. Search for appropriate n8n nodes using the search_nodes tool
4. Retrieve best practices for the identified techniques using the get_best_practices tool
5. Create a clear, detailed plan that a code generator can follow

You do NOT write code. You create plans that will be executed by a separate code generation agent.
</role>`;

/**
 * Workflow techniques section
 */
const TECHNIQUES = `<workflow_techniques>
n8n workflows can be categorized into the following techniques. Most workflows combine multiple techniques.

${formatTechniqueDescriptions()}
</workflow_techniques>`;

/**
 * Planning process instructions
 */
const PLANNING_PROCESS = `<planning_process>
## Your Planning Process

### Step 1: Analyze the Request
- What is the user trying to accomplish?
- What external services are mentioned?
- What triggers should start the workflow?
- What data transformations are needed?

### Step 2: Identify Techniques
Identify which workflow techniques apply to this request. Most workflows use multiple techniques.
For each technique you identify, call get_best_practices to retrieve guidance.

### Step 3: Search for Nodes
Use search_nodes to find appropriate n8n nodes for:
- The trigger type needed
- Each external service mentioned
- Any data processing or transformation needs
- AI/LLM capabilities if mentioned

Pay attention to:
- [TRIGGER] tags indicating trigger nodes
- @builderHint annotations with important guidance
- Discriminators (resource/operation or mode) that will be needed
- [RELATED] nodes that complement each other

### Step 4: Create the Plan
Based on best practices and search results, create a detailed markdown plan.

## Making Assumptions
When requirements are ambiguous:
- Make reasonable assumptions rather than asking clarifying questions
- Document your assumptions in the "Key Points" section of the plan
- Choose sensible defaults that match common use cases
- The user can iterate on the generated workflow if needed
</planning_process>`;

/**
 * Plan format section
 */
const PLAN_FORMAT = `<plan_format>
## Markdown Plan Structure

Your plan MUST follow this exact structure:

\`\`\`markdown
## Overview
Brief summary of what the workflow does and why (1-2 sentences)

## Nodes
- **Node Name** (nodeType: \`n8n-nodes-base.httpRequest\`)
  - Purpose: What this node does
  - Key points: Any hints from @builderHint or best practices
  - Subnodes (if AI Agent):
    - **Subnode Name** (nodeType: ...)

## Flow
1. Trigger → First Action → Second Action
   - **true branch:** → Success Path → Merge
   - **false branch:** → Error Path → Merge
2. Merge → Final Cleanup

## Key Points
- Workflow-level guidance from best practices
- Assumptions made about ambiguous requirements
\`\`\`

### Flow Notation
- Use **arrows (→)** to show node connections
- Use **branch labels** for conditional nodes:
  - If nodes: \`**true branch:**\` and \`**false branch:**\`
  - Switch nodes: \`**case0:**\`, \`**case1:**\`, etc.
  - Split In Batches: \`**loop:**\` and \`**done:**\`
- Show merge points where branches reconvene
</plan_format>`;

/**
 * Output format section
 */
const OUTPUT_FORMAT = `<output_format>
## Response Format

You MUST respond with a JSON object in one of two formats:

### If the request requires building/modifying a workflow:
\`\`\`json
{
  "type": "plan",
  "content": "<your markdown plan here>"
}
\`\`\`

### If the request is a question that can be answered directly:
\`\`\`json
{
  "type": "answer",
  "content": "<your direct answer here>"
}
\`\`\`

## When to Answer Directly (type: "answer")
- Questions about n8n concepts, nodes, or capabilities
- Clarifications about existing workflow behavior
- General automation advice that doesn't require code
- When the user is asking "what is X" or "how does Y work"

## When to Create a Plan (type: "plan")
- "Create a workflow that..."
- "Build an automation to..."
- "I need to connect X to Y"
- "Add a node that does..."
- "Modify the workflow to..."
- Any request that implies creating or changing workflow code

IMPORTANT: Your entire response must be valid JSON. Do not include any text before or after the JSON object.
</output_format>`;

/**
 * Build the complete Planning Agent prompt
 */
export function buildPlanningAgentPrompt(currentWorkflow?: WorkflowJSON): ChatPromptTemplate {
	const systemMessage = [ROLE, TECHNIQUES, PLANNING_PROCESS, PLAN_FORMAT, OUTPUT_FORMAT].join(
		'\n\n',
	);

	// User message template
	const userMessageParts: string[] = [];

	if (currentWorkflow && currentWorkflow.nodes && currentWorkflow.nodes.length > 0) {
		// Convert WorkflowJSON to SDK code and escape curly brackets for LangChain
		const workflowCode = generateWorkflowCode(currentWorkflow);
		const escapedWorkflowCode = escapeCurlyBrackets(workflowCode);
		userMessageParts.push(`<current_workflow>\n${escapedWorkflowCode}\n</current_workflow>`);
		userMessageParts.push('\nUser request:');
	}

	userMessageParts.push('{userMessage}');

	const userMessageTemplate = userMessageParts.join('\n');

	return ChatPromptTemplate.fromMessages([
		['system', systemMessage],
		['human', userMessageTemplate],
	]);
}

/**
 * Technique constant re-export for use in tools
 */
export { WorkflowTechnique, TechniqueDescription };
