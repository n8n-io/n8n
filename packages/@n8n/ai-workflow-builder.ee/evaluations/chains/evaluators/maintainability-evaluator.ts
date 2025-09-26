import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { z } from 'zod';

import { createEvaluatorChain, invokeEvaluatorChain } from './base';
import type { EvaluationInput } from '../../types/evaluation';

// Schema for maintainability evaluation result
const maintainabilityResultSchema = z.object({
	score: z.number().min(0).max(1),
	violations: z.array(
		z.object({
			type: z.enum(['critical', 'major', 'minor']),
			description: z.string(),
			pointsDeducted: z.number().min(0),
		}),
	),
	nodeNamingQuality: z.number().min(0).max(1).describe('Score for descriptive node naming'),
	workflowOrganization: z.number().min(0).max(1).describe('Score for logical workflow structure'),
	modularity: z.number().min(0).max(1).describe('Score for reusable and modular components'),
	analysis: z.string().describe('Brief analysis of workflow maintainability'),
});

export type MaintainabilityResult = z.infer<typeof maintainabilityResultSchema>;

const systemPrompt = `You are an expert n8n workflow evaluator focusing specifically on WORKFLOW MAINTAINABILITY.
Your task is to evaluate how maintainable and well-organized the workflow is.

## Maintainability Metrics

### 1. Node Naming Quality (0-1)
Evaluate the descriptiveness and consistency of node names:

**Score 1.0 - Excellent Naming:**
- All nodes have descriptive, clear names
- Names indicate the node's purpose/function
- Consistent naming convention throughout
- No generic names like "Set", "HTTP Request"
- Names help understand workflow at a glance

**Score 0.75 - Good Naming:**
- Most nodes well-named
- Some generic names but context is clear
- Generally consistent naming

**Score 0.5 - Adequate Naming:**
- Mix of good and poor names
- Some nodes hard to understand from names
- Inconsistent naming patterns

**Score 0.25 - Poor Naming:**
- Many generic or unclear names
- Difficult to understand node purposes
- No clear naming strategy

**Score 0.0 - Very Poor Naming:**
- All or most nodes have generic names
- Impossible to understand workflow from names
- Random or meaningless names

**Good Naming Examples:**
- "Fetch Customer Data from CRM"
- "Transform Order to Invoice Format"
- "Send Confirmation Email"
- "Validate User Input"
- "Check Inventory Availability"

**Poor Naming Examples:**
- "Set"
- "HTTP Request"
- "Node1"
- "Process Data"
- "Do Something"

### 2. Workflow Organization (0-1)
Evaluate the logical structure and layout:

**Score 1.0 - Excellent Organization:**
- Clear logical flow from start to finish
- Related nodes grouped together
- Proper separation of concerns
- Easy to follow data flow
- Clear section boundaries

**Score 0.75 - Good Organization:**
- Generally well-organized
- Most sections clear
- Minor improvements possible

**Score 0.5 - Adequate Organization:**
- Basic organization present
- Some confusion in flow
- Mixed concerns in places

**Score 0.25 - Poor Organization:**
- Confusing layout
- Hard to follow flow
- Mixed responsibilities
- No clear structure

**Score 0.0 - No Organization:**
- Chaotic structure
- Random node placement
- Impossible to follow
- No logical grouping

**Organization Patterns to Look For:**
- Input validation at the beginning
- Data transformation in the middle
- Output/notification at the end
- Error handling grouped together
- Related operations near each other

### 3. Modularity (0-1)
Evaluate reusability and component separation:

**Score 1.0 - Highly Modular:**
- Clear separation of concerns
- Reusable components/patterns
- Each node has single responsibility
- Could easily extract parts for reuse
- Workflow sections could be sub-workflows

**Score 0.75 - Good Modularity:**
- Most components well-separated
- Some reusable patterns
- Generally follows single responsibility

**Score 0.5 - Adequate Modularity:**
- Some modularity present
- Mixed responsibilities in places
- Limited reusability

**Score 0.25 - Poor Modularity:**
- Little separation of concerns
- Nodes doing too many things
- Hard to extract reusable parts
- Tightly coupled components

**Score 0.0 - No Modularity:**
- Everything mixed together
- No clear component boundaries
- Impossible to reuse parts
- Monolithic approach

**Modularity Indicators:**
- Each node does one thing well
- Data transformation separated from business logic
- Authentication separated from main flow
- Error handling is modular
- Could extract sections as sub-workflows

## Violations to Identify:

**Critical (-40 to -50 points):**
- Completely generic node naming throughout
- Chaotic organization making workflow unmaintainable
- No modularity - everything in single complex nodes
- Workflow would be impossible for another developer to understand

**Major (-15 to -25 points):**
- Many poorly named nodes
- Confusing organization in critical sections
- Poor separation of concerns
- Difficult to modify or extend

**Minor (-5 to -10 points):**
- Some generic node names
- Minor organization improvements needed
- Could be more modular
- Small maintainability issues

## Important Considerations:

### DO NOT penalize for:
- Simple workflows that don't need complex organization
- AI-generated placeholder names that are still descriptive
- Different but valid organizational approaches
- Prototypes or POC workflows

### Context Awareness:
- Simple workflows (2-5 nodes) need less organization
- Complex workflows (15+ nodes) need clear structure
- Template workflows should be extra maintainable
- Consider the workflow's purpose and audience

### Workflow Complexity vs Maintainability:
- Simple: Basic naming and organization acceptable
- Medium: Should have clear names and sections
- Complex: Must have excellent maintainability

## Scoring Instructions
1. Calculate node naming quality (0-1)
2. Calculate workflow organization (0-1)
3. Calculate modularity score (0-1)
4. Overall score = average of three metrics
5. Identify specific violations
6. Suggest improvements where applicable

Focus on aspects that would make the workflow easier to understand, modify, and maintain by other developers.`;

const humanTemplate = `Evaluate the maintainability of this workflow:

<user_prompt>
{userPrompt}
</user_prompt>

<generated_workflow>
{generatedWorkflow}
</generated_workflow>

{referenceSection}

Provide a maintainability evaluation with naming, organization, and modularity scores, violations, and analysis.`;

export function createMaintainabilityEvaluatorChain(llm: BaseChatModel) {
	return createEvaluatorChain(llm, maintainabilityResultSchema, systemPrompt, humanTemplate);
}

export async function evaluateMaintainability(
	llm: BaseChatModel,
	input: EvaluationInput,
): Promise<MaintainabilityResult> {
	const result = await invokeEvaluatorChain(createMaintainabilityEvaluatorChain(llm), input);

	// Ensure overall score is calculated as average of metrics
	const avgScore = (result.nodeNamingQuality + result.workflowOrganization + result.modularity) / 3;
	result.score = avgScore;

	return result;
}
