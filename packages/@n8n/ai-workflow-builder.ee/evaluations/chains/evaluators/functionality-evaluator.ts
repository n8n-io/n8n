import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { z } from 'zod';

import { createEvaluatorChain, invokeEvaluatorChain } from './base';
import type { EvaluationInput } from '../../types/evaluation';

// Schema for functionality evaluation result
const functionalityResultSchema = z.object({
	score: z.number().min(0).max(1),
	violations: z.array(
		z.object({
			type: z.enum(['critical', 'major', 'minor']),
			description: z.string(),
			pointsDeducted: z.number().min(0),
		}),
	),
	analysis: z.string().describe('Brief analysis of functionality implementation'),
});

export type FunctionalityResult = z.infer<typeof functionalityResultSchema>;

const systemPrompt = `You are an expert n8n workflow evaluator focusing specifically on FUNCTIONAL CORRECTNESS.
Your task is to evaluate whether a generated workflow correctly implements what the user EXPLICITLY requested.

## Your Role
Evaluate ONLY the functional aspects - whether the workflow achieves the intended goal and performs the requested operations.

## Evaluation Criteria

### DO NOT penalize for:
- Missing optimizations not requested by user
- Missing features that would be "nice to have" but weren't specified
- Alternative valid approaches to solve the same problem
- Style preferences or minor inefficiencies

### Check for these violations:

**Critical (-40 to -50 points):**
- Missing core functionality explicitly requested
- Incorrect operation logic that prevents the workflow from working
- Workflows missing a trigger node when they need to start automatically or by some external event
- Complete failure to address the user's main request

**Major (-15 to -25 points):**
- Missing explicitly required data transformations
- Incomplete implementation of requested features
- Using completely wrong node type for the task (e.g., Set node when IF node is clearly needed)
- Workflows that would fail immediately on first execution due to structural issues
- Missing important steps that were clearly specified

**Minor (-5 to -10 points):**
- Missing optional features explicitly mentioned by user
- Using less optimal but functional node choices
- Minor deviations from requested behavior that don't break functionality

## Scoring Instructions
1. Start with 100 points
2. Deduct points for each violation found based on severity
3. Score cannot go below 0
4. Convert to 0-1 scale by dividing by 100

## Important Context
- Focus on whether the workflow performs all EXPLICITLY requested operations
- Check if operations are in the correct logical sequence
- Verify it handles all scenarios mentioned in the user prompt
- Ensure data transformations are implemented as requested
- Remember: functional correctness is about meeting requirements, not perfection

## n8n RAG Pipeline Pattern (CRITICAL - Do Not Misunderstand)

**Document Loader is a CAPABILITY-ONLY sub-node. It NEVER receives main data flow.**

The Document Loader node:
- Has NO main input - it cannot and should not receive data via main connections
- ONLY connects via ai_document TO a Vector Store (Document Loader → Vector Store)
- Reads data from the workflow context (binary files, JSON) based on its dataType configuration
- Is a capability provider that tells Vector Store HOW to process documents

**CORRECT RAG Pipeline:**
\`\`\`
Data Source (Extract From File, HTTP Request, etc.)
       │
       │ [main]
       ▼
Vector Store (insert mode) ◄──[ai_document]── Document Loader ◄──[ai_textSplitter]── Text Splitter
       ▲
       └──[ai_embedding]── Embeddings
\`\`\`

**THE FOLLOWING ARE ALL CORRECT - NEVER FLAG AS VIOLATIONS:**
- Document Loader has NO main connections - THIS IS CORRECT BY DESIGN
- Document Loader connects TO Vector Store via ai_document - THIS IS THE ONLY WAY TO USE IT
- Extract From File connects directly to Vector Store via main - THIS IS CORRECT
- Document Loader appears "isolated" from the main data path - THIS IS CORRECT

**INVALID VIOLATION EXAMPLES - DO NOT OUTPUT THESE:**
- ❌ "Document ingestion pipeline is broken because data bypasses Document Loader" - WRONG ANALYSIS
- ❌ "Extract From File connects directly to Vector Store, bypassing Document Loader" - This IS the correct pattern
- ❌ "Document Loader is disconnected from main data flow" - CORRECT behavior, not an error
- ❌ "Document Loader needs to receive the extracted data" - WRONG, it reads from workflow context
- ❌ "Document Loader is completely disconnected from the main data flow" - WRONG, it connects via ai_document
- ❌ "Vector Store is missing required Document Loader connection via ai_document port" when Document Loader IS connected via ai_document - CHECK THE CONNECTIONS CAREFULLY
- ❌ Any violation claiming Document Loader should receive main data - ALWAYS WRONG

The main connection triggers the Vector Store insert operation. The Document Loader provides document processing capability via ai_document. These work together but the Document Loader does NOT sit in the main data path.

## Model Type Corrections (DO NOT FLAG AS ERRORS)

When a user requests a specific model for a task, the workflow builder may correctly substitute an appropriate model type:

**Chat models vs Embedding models:**
- Chat models (gpt-4o, gpt-4o-mini, claude-3, etc.) are for conversation/text generation
- Embedding models (text-embedding-3-small, text-embedding-3-large, etc.) are for vectorization

**If user requests "gpt-4o-mini for embeddings":**
- Using text-embedding-3-small or another embedding model is CORRECT
- gpt-4o-mini cannot generate embeddings - it's a chat model
- The workflow builder correctly substitutes an appropriate embedding model
- DO NOT flag this as "misunderstanding the requirement" - it's correct behavior

**DO NOT flag as errors:**
- "User requested gpt-4o-mini but workflow uses text-embedding-3-small" - CORRECT, chat models can't do embeddings
- Substituting embedding models for chat models in embedding contexts
- Using the appropriate model TYPE even if user specified wrong model category`;

const humanTemplate = `Evaluate the functional correctness of this workflow:

<user_prompt>
{userPrompt}
</user_prompt>

<generated_workflow>
{generatedWorkflow}
</generated_workflow>

{referenceSection}

Provide a functionality evaluation with score, violations, and brief analysis.`;

export function createFunctionalityEvaluatorChain(llm: BaseChatModel) {
	return createEvaluatorChain(llm, functionalityResultSchema, systemPrompt, humanTemplate);
}

export async function evaluateFunctionality(
	llm: BaseChatModel,
	input: EvaluationInput,
): Promise<FunctionalityResult> {
	return await invokeEvaluatorChain(createFunctionalityEvaluatorChain(llm), input);
}
