/**
 * Planner tools for Plan Mode in the AI Workflow Builder.
 *
 * These are output tools used by the planner subgraph to structure its output.
 * Unlike discovery tools that perform actions, these tools define the schema
 * for the planner's outputs (questions and plans).
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import type { BuilderToolBase } from '@/utils/stream-processor';

// ============================================================================
// Schemas
// ============================================================================

/**
 * Schema for a single clarifying question
 */
const plannerQuestionSchema = z.object({
	id: z.string().describe('Unique identifier for the question (e.g., "q1", "q2")'),
	question: z.string().describe('The question text to display to the user'),
	type: z
		.enum(['single', 'multi', 'text'])
		.describe('Question type: single (radio), multi (checkbox), or text (textarea)'),
	options: z.array(z.string()).optional().describe('Predefined options for single/multi types'),
	allowCustom: z.boolean().optional().default(true).describe('Whether to show "Other" text input'),
});

/**
 * Schema for submitting questions to the user
 */
export const submitQuestionsSchema = z.object({
	introMessage: z.string().optional().describe('Optional introductory message before questions'),
	questions: z
		.array(plannerQuestionSchema)
		.min(1)
		.max(5)
		.describe('Array of 1-5 clarifying questions to ask the user'),
});

/**
 * Schema for a single workflow step
 */
const planStepSchema = z.object({
	description: z.string().describe('Description of what this step does'),
	subSteps: z.array(z.string()).optional().describe('Optional sub-steps for complex operations'),
	suggestedNodes: z.array(z.string()).optional().describe('Suggested n8n node names for this step'),
});

/**
 * Schema for submitting the final plan
 */
export const submitPlanSchema = z.object({
	summary: z.string().describe('Bold headline summarizing the workflow (1-2 sentences)'),
	trigger: z.string().describe('Description of what initiates the workflow'),
	steps: z.array(planStepSchema).min(1).describe('Numbered list of workflow steps'),
	additionalSpecs: z
		.array(z.string())
		.optional()
		.describe('Additional constraints or requirements'),
});

// ============================================================================
// Tool Metadata
// ============================================================================

export const SUBMIT_QUESTIONS_TOOL: BuilderToolBase = {
	toolName: 'submit_questions',
	displayTitle: 'Generating questions',
};

export const SUBMIT_PLAN_TOOL: BuilderToolBase = {
	toolName: 'submit_plan',
	displayTitle: 'Generating plan',
};

// ============================================================================
// Tool Factories
// ============================================================================

/**
 * Creates the submit_questions tool.
 * This is an output tool - the LLM calls it to structure questions for the user.
 * The actual question display is handled by the subgraph's formatOutput.
 */
export function createSubmitQuestionsTool() {
	return tool(
		// The function body is a no-op - we extract args from the tool call in formatOutput
		() => 'Questions submitted successfully',
		{
			name: SUBMIT_QUESTIONS_TOOL.toolName,
			description: `Submit clarifying questions to gather requirements from the user.

Guidelines for questions:
- Ask 1-5 questions maximum
- Ask the MOST IMPORTANT questions first
- Use 'single' for mutually exclusive choices (radio buttons)
- Use 'multi' when multiple options can apply (checkboxes)
- Use 'text' sparingly, only when options can't be predefined
- Provide 3-4 predefined options when possible
- Set allowCustom: true (default) to let users add custom answers

Example:
{
  "introMessage": "I'd love to understand your workflow better. Let me ask a few questions:",
  "questions": [
    {
      "id": "q1",
      "question": "What should trigger this workflow?",
      "type": "single",
      "options": ["On a schedule", "When a webhook is received", "When a form is submitted", "Manually"]
    },
    {
      "id": "q2",
      "question": "Where should the results be saved?",
      "type": "multi",
      "options": ["Google Sheets", "Slack", "Email notification", "Database"]
    }
  ]
}`,
			schema: submitQuestionsSchema,
		},
	);
}

/**
 * Creates the submit_plan tool.
 * This is an output tool - the LLM calls it to structure the implementation plan.
 * The actual plan display is handled by the subgraph's formatOutput.
 */
export function createSubmitPlanTool() {
	return tool(
		// The function body is a no-op - we extract args from the tool call in formatOutput
		() => 'Plan submitted successfully',
		{
			name: SUBMIT_PLAN_TOOL.toolName,
			description: `Submit the final implementation plan after gathering requirements.

The plan should include:
1. **Summary**: One bold sentence describing what the workflow does
2. **Trigger**: What initiates the workflow (schedule, webhook, event, etc.)
3. **Steps**: Numbered list of workflow steps with optional sub-steps
4. **Additional specs**: Any constraints or requirements (optional)

For each step, include:
- A clear description of what happens
- Sub-steps for complex operations
- Suggested n8n nodes when known (from your search results)

Example:
{
  "summary": "Build a workflow that automatically generates social media posts from blog content",
  "trigger": "When a new blog post is published via webhook",
  "steps": [
    {
      "description": "Receive webhook notification of new blog post",
      "suggestedNodes": ["Webhook"]
    },
    {
      "description": "Extract blog content and metadata",
      "subSteps": [
        "Fetch the full blog post content",
        "Extract title, summary, and key points"
      ],
      "suggestedNodes": ["HTTP Request", "HTML Extract"]
    },
    {
      "description": "Generate social media posts using AI",
      "subSteps": [
        "Create Twitter/X thread (max 280 chars per tweet)",
        "Create LinkedIn post (professional tone)",
        "Create Instagram caption"
      ],
      "suggestedNodes": ["OpenAI", "Set"]
    },
    {
      "description": "Post to social media platforms",
      "suggestedNodes": ["Twitter", "LinkedIn", "HTTP Request"]
    }
  ],
  "additionalSpecs": [
    "Include relevant hashtags",
    "Schedule posts 1 hour apart"
  ]
}`,
			schema: submitPlanSchema,
		},
	);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all planner tools for display in the UI.
 * Similar to getBuilderToolsForDisplay but for planner-specific tools.
 */
export function getPlannerToolsForDisplay(): BuilderToolBase[] {
	return [SUBMIT_QUESTIONS_TOOL, SUBMIT_PLAN_TOOL];
}

// ============================================================================
// Type exports for use in subgraph
// ============================================================================

export type SubmitQuestionsInput = z.infer<typeof submitQuestionsSchema>;
export type SubmitPlanInput = z.infer<typeof submitPlanSchema>;
export type PlannerQuestionInput = z.infer<typeof plannerQuestionSchema>;
