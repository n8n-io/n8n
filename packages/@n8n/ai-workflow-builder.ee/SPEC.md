# Plan Mode for AI Workflow Builder

## Overview

Plan Mode is a new feature in the AI Workflow Builder that helps users refine their workflow requirements through a guided question-and-answer flow before generating a detailed implementation plan. This enables users to clarify their needs upfront, resulting in more accurate and relevant workflow generation.

## Problem Statement

Users often have a high-level idea of what they want to automate but lack the specificity needed for the AI to generate an optimal workflow. This leads to:
- Multiple iteration cycles to get the desired result
- Wasted credits on suboptimal workflow generations
- User frustration from misaligned expectations

## Solution

Introduce a **Plan Mode** that:
1. Guides users through clarifying questions to gather requirements
2. Generates a detailed implementation plan based on their answers
3. Allows users to refine the plan through conversation
4. Enables seamless transition to Build mode for implementation

## User Stories

1. **As a user**, I want to choose between Build and Plan modes so I can decide whether to generate a workflow directly or plan first.
2. **As a user**, I want the AI to ask me clarifying questions so my requirements are fully understood before planning.
3. **As a user**, I want to skip questions that aren't relevant to my use case.
4. **As a user**, I want to see a summary of my answers before the plan is generated.
5. **As a user**, I want to refine the generated plan by chatting with the AI.
6. **As a user**, I want to implement the plan with a single click when I'm satisfied.

## Architecture

### High-Level Design

Plan Mode is implemented as a new **Planner Subgraph** that integrates with the existing multi-agent architecture. It reuses discovery tools for node identification while adding its own Q&A and plan generation logic.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PARENT GRAPH                                       │
│                                                                              │
│   START → check_state → check_mode ──┬── mode='build' ──→ supervisor ────┐  │
│                                      │                                    │  │
│                                      └── mode='plan' ──→ planner_subgraph│  │
│                                                              │            │  │
│   ┌──────────────────────────────────────────────────────────┘            │  │
│   │                                                                       │  │
│   ▼                                                                       ▼  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     PLANNER SUBGRAPH                                 │    │
│  │                                                                      │    │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │    │
│  │  │  analyze    │ →  │  question   │ →  │  generate   │              │    │
│  │  │  request    │    │  loop       │    │  plan       │              │    │
│  │  └─────────────┘    └─────────────┘    └─────────────┘              │    │
│  │        │                   │                  │                      │    │
│  │        │          (uses discovery tools)      │                      │    │
│  │        ▼                   ▼                  ▼                      │    │
│  │  ┌─────────────────────────────────────────────────────┐            │    │
│  │  │              SHARED DISCOVERY TOOLS                  │            │    │
│  │  │  • search_nodes                                      │            │    │
│  │  │  • get_node_details                                  │            │    │
│  │  │  • get_documentation                                 │            │    │
│  │  │  • get_workflow_examples                             │            │    │
│  │  └─────────────────────────────────────────────────────┘            │    │
│  │                                                                      │    │
│  │  OUTPUT: PlanOutput (not WorkflowOperation[])                       │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      ▼                                       │
│                              process_plan_result ───→ responder ───→ END    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Mode Behavior

| Aspect | Build Mode | Plan Mode |
|--------|------------|-----------|
| Default | Yes | No |
| Can edit workflows | Yes | No (read-only) |
| Planning tool available | Yes | Yes |
| Generates workflow | Yes | No |
| Uses planner subgraph | No (via supervisor) | Yes (direct routing) |

### Key Architectural Decisions

1. **Planner as a subgraph**: Plan Mode uses a dedicated `PlannerSubgraph` that follows the existing subgraph pattern (`BaseSubgraph` interface)
2. **Reuses discovery tools**: Planner imports and uses `search_nodes`, `get_node_details`, `get_documentation` from discovery
3. **Read-only enforcement**: Planner outputs `PlanOutput`, not `WorkflowOperation[]` - it cannot modify workflows
4. **Multi-turn with checkpointer**: Q&A flow uses LangGraph's checkpointer to persist state between invocations (human-in-the-loop pattern)
5. **No automatic mode switching**: The system does not automatically change modes based on user input (v1)
6. **Shared conversation context**: Mode switching preserves conversation history

### File Structure

```
packages/@n8n/ai-workflow-builder.ee/src/
├── subgraphs/
│   ├── planner.subgraph.ts          # NEW: Main planner subgraph
│   ├── planner-state.ts             # NEW: Planner-specific state
│   ├── discovery.subgraph.ts        # Existing
│   ├── builder.subgraph.ts          # Existing
│   └── configurator.subgraph.ts     # Existing
├── prompts/
│   └── agents/
│       ├── planner.prompt.ts        # NEW: Planner agent prompts
│       └── discovery.prompt.ts      # Existing (has "NEVER ask questions" rule)
├── tools/
│   ├── planner-tools.ts             # NEW: Question generation, plan output
│   └── discovery-tools.ts           # MODIFY: Export tools for reuse
├── types/
│   ├── planner-types.ts             # NEW: Question, Answer, Plan types
│   └── coordination.ts              # MODIFY: Add 'planner' phase
└── multi-agent-workflow-subgraphs.ts # MODIFY: Add mode routing + planner node
```

## Human-in-the-Loop (HITL) Flow

The Q&A phase requires a human-in-the-loop pattern where the agent pauses, waits for user input, then continues. We use **multi-turn with checkpointer** approach.

### Why Multi-Turn?

The current architecture runs agents to completion in a single invocation. Plan Mode's Q&A flow needs to:
1. Generate questions → pause → wait for answers → continue

This is achieved by:
- Treating question emission as an "end" of the first invocation
- Persisting state via LangGraph's checkpointer
- Processing answers in a second invocation that resumes from saved state

### HITL Invocation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ INVOCATION 1 (initial request)                                               │
│                                                                              │
│  User: "Automate video generation with Sora 2 & Veo"                         │
│                        │                                                     │
│                        ▼                                                     │
│               ┌─────────────────┐                                            │
│               │ planner_subgraph │                                           │
│               │                  │                                           │
│               │  analyze_request │                                           │
│               │        │         │                                           │
│               │        ▼         │                                           │
│               │  questions: [...]│                                           │
│               │        │         │                                           │
│               │        ▼         │                                           │
│               │  plannerPhase:   │                                           │
│               │  'waiting'       │──── State saved to checkpointer           │
│               └─────────────────┘                                            │
│                        │                                                     │
│                        ▼                                                     │
│               ┌─────────────────┐                                            │
│               │    responder    │                                            │
│               │                 │                                            │
│               │ Returns special │                                            │
│               │ 'questions' msg │                                            │
│               └─────────────────┘                                            │
│                        │                                                     │
│                        ▼                                                     │
│            Frontend renders Q&A UI                                           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                         │
                         │  User interacts with UI, clicks "Next" on each
                         │
                         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ INVOCATION 2 (answers submitted)                                              │
│                                                                               │
│  User: { type: 'question_answers', answers: [...] }                           │
│                        │                                                      │
│                        ▼                                                      │
│               ┌─────────────────┐                                             │
│               │   check_state   │                                             │
│               │        │        │                                             │
│               │  Detects pending│                                             │
│               │  planner state  │──── Loads from checkpointer                 │
│               │        │        │                                             │
│               │        ▼        │                                             │
│               │ planner_subgraph│                                             │
│               │                 │                                             │
│               │ process_answers │                                             │
│               │        │        │                                             │
│               │        ▼        │                                             │
│               │  generate_plan  │                                             │
│               └─────────────────┘                                             │
│                        │                                                      │
│                        ▼                                                      │
│               ┌─────────────────┐                                             │
│               │    responder    │                                             │
│               │                 │                                             │
│               │ Returns 'plan'  │                                             │
│               │    message      │                                             │
│               └─────────────────┘                                             │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Plan Refinement Loop

After a plan is generated, users can refine it by sending messages instead of clicking "Implement the plan". The system stays in Plan Mode and updates the plan based on feedback.

### Refinement Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PLAN REFINEMENT LOOP                                  │
│                                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                    │
│  │   Q&A Flow  │ ──▶ │    Plan     │ ──▶ │  Refinement │ ──┐                │
│  │             │     │  Generated  │     │   Message   │   │                │
│  └─────────────┘     └─────────────┘     └──────┬──────┘   │                │
│                                                  │          │                │
│                                                  ▼          │                │
│                                          ┌─────────────┐   │                │
│                                          │   Refine    │   │                │
│                                          │    Plan     │   │                │
│                                          └──────┬──────┘   │                │
│                                                  │          │                │
│                                                  ▼          │                │
│                                          ┌─────────────┐   │                │
│                                          │  Updated    │───┘                │
│                                          │    Plan     │   (loop continues  │
│                                          └──────┬──────┘    until user is   │
│                                                  │          satisfied)       │
│                                                  │                           │
│                           User clicks            │                           │
│                        "Implement the plan"      │                           │
│                                                  ▼                           │
│                                          ┌─────────────┐                    │
│                                          │ Build Mode  │                    │
│                                          │  (implements│                    │
│                                          │   the plan) │                    │
│                                          └─────────────┘                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Refinement Detection

```typescript
function detectPlannerAction(state: ParentGraphState): string {
  const lastMessage = state.messages[state.messages.length - 1];
  const isUserMessage = lastMessage._getType() === 'human';

  // Q&A answers submitted
  if (isAnswersMessage(lastMessage) && state.plannerPhase === 'waiting_for_answers') {
    return 'resume_planner_with_answers';
  }

  // User sent a refinement message (has existing plan + new user message)
  if (isUserMessage && state.plannerPhase === 'plan_displayed' && state.planOutput) {
    return 'refine_plan';
  }

  // "Implement the plan" clicked (special message type)
  if (isImplementPlanMessage(lastMessage) && state.planOutput) {
    return 'implement_plan';
  }

  // User switched to Build mode while having a plan
  if (state.mode === 'build' && state.planOutput) {
    return 'implement_plan';
  }

  // Fresh planning request
  if (isUserMessage && state.mode === 'plan' && !state.planOutput) {
    return 'start_planning';
  }

  return 'continue';  // Normal build mode routing
}
```

## Planner State Machine

```
                         mode='plan'
                              │
                              ▼
                    ┌──────────────────┐
                    │    ANALYZING     │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
     Questions needed            No questions needed
              │                             │
              ▼                             │
    ┌──────────────────┐                   │
    │ WAITING_ANSWERS  │                   │
    └────────┬─────────┘                   │
             │ answers submitted           │
             ▼                             │
    ┌──────────────────┐                   │
    │ GENERATING_PLAN  │◄──────────────────┘
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │  PLAN_DISPLAYED  │◄─────────────────────────┐
    └────────┬─────────┘                          │
             │                                     │
    ┌────────┼────────────────────┐               │
    │        │                    │               │
    ▼        ▼                    ▼               │
 "Implement" User types      Mode switch          │
   click     message         to Build             │
    │        │                    │               │
    │        ▼                    │               │
    │  ┌──────────────┐          │               │
    │  │ REFINING_PLAN│──────────┼───────────────┘
    │  └──────────────┘          │    (updated plan)
    │                            │
    └────────────┬───────────────┘
                 │
                 ▼
         ┌─────────────┐
         │ BUILD_MODE  │
         │             │
         │ Plan passed │
         │ as context  │
         └─────────────┘
```

### Phase Definitions

```typescript
// Simplified to only the states that represent HITL pause points
type PlannerPhase =
  | 'idle'                    // No planning in progress
  | 'waiting_for_answers'     // Questions displayed, waiting for user
  | 'plan_displayed';         // Plan displayed, waiting for user action
```

## UI Specification

### Mode Selector

- **Location**: Dropdown inside the builder input area
- **Options**:
  - `Build` (default, with checkmark when selected)
  - `Plan`
- **Tooltip**: "Create a plan or ask questions about your workflow"

### Message Types

The frontend needs to handle these message types:

| Type | Sender | Description |
|------|--------|-------------|
| `text` | AI | Normal text message |
| `questions` | AI | Q&A UI with questions |
| `question_answers` | User | User's answers to questions |
| `answer_summary` | AI | Summary of answered questions |
| `plan` | AI | Generated plan with "Implement" button |
| `implement_plan` | User | User clicked "Implement the plan" |

### Message Flow Example

```
┌─────────────────────────────────────────────────────────────────┐
│                        MESSAGE TYPES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. USER MESSAGE (mode: 'plan')                                  │
│     "I want to automate video generation with Sora 2 & Veo"     │
│                                                                  │
│  2. AI MESSAGE (type: 'thinking')                                │
│     "Thought for 12s"                                            │
│                                                                  │
│  3. AI MESSAGE (type: 'text')                                    │
│     "That sounds like an exciting project! I'd love to          │
│      understand your vision better..."                           │
│                                                                  │
│  4. AI MESSAGE (type: 'questions')          ◄── NEW MESSAGE TYPE │
│     {                                                            │
│       questions: [                                               │
│         { id: 'q1', question: 'What kicks off...', type: 'multi',│
│           options: ['Form submission', 'Slack message', ...] },  │
│         { id: 'q2', question: 'Where should...', type: 'single', │
│           options: ['Google Drive', 'Slack', 'Notion'] }         │
│       ]                                                          │
│     }                                                            │
│                                                                  │
│  5. USER MESSAGE (type: 'question_answers') ◄── NEW MESSAGE TYPE │
│     {                                                            │
│       answers: [                                                 │
│         { questionId: 'q1', selectedOptions: ['Slack message'] },│
│         { questionId: 'q2', selectedOptions: ['Google Drive'] }  │
│       ]                                                          │
│     }                                                            │
│                                                                  │
│  6. AI MESSAGE (type: 'answer_summary')                          │
│     "Where should the generated videos land? Google Drive"       │
│                                                                  │
│  7. AI MESSAGE (type: 'plan')               ◄── NEW MESSAGE TYPE │
│     {                                                            │
│       summary: "Build a workflow that generates...",             │
│       trigger: "When a message is posted to Slack...",           │
│       steps: [...],                                              │
│       showImplementButton: true                                  │
│     }                                                            │
│                                                                  │
│  8. USER ACTION: Click "Implement the plan"                      │
│     → Switches to Build mode                                     │
│     → Sends plan as context to supervisor                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Question Message UI

A new message type that the agent sends to gather requirements from users.

#### Question Types

| Type | UI Component | Behavior |
|------|--------------|----------|
| Single | Radio buttons | Select one option |
| Multi | Checkboxes | Select multiple options |
| Text | Textarea | Free-form input |

#### Question UI Elements

- **Question text**: Bold header describing what's being asked
- **Options**: List of predefined choices (for Single/Multi types)
- **Custom input**: Text field labeled "Other" for adding custom answers (Single/Multi types only)
- **Progress indicator**: Dots showing current position in question sequence
- **Navigation buttons**:
  - `Back` - Return to previous question
  - `Next` - Proceed to next question (allows skipping)

#### Constraints

- Maximum of **5 questions** per planning session
- Users can skip any question by clicking `Next` without selecting an answer
- Skipped questions are excluded from the answer summary

### Answer Summary

After all questions are answered (or skipped), the agent sends a summary message:
- Displayed as a regular chat message
- Shows question-answer pairs for answered questions only
- Skipped questions are not included in the summary

### Plan Output

The generated plan includes:

1. **Summary statement**: Bold description of what the workflow will do
2. **Trigger**: Description of what initiates the workflow
3. **Steps**: Numbered list of workflow steps with sub-steps where needed
4. **Additional specs**: Relevant constraints or requirements (e.g., "Video specs: Short format under 60 seconds")
5. **Action button**: `Implement the plan` button to transition to Build mode

### Frontend Message Rendering

```typescript
function renderMessage(message: ChatMessage) {
  switch (message.type) {
    case 'text':
      return <TextMessage content={message.content} />;

    case 'questions':
      return (
        <QuestionFlow
          questions={message.questions}
          onSubmit={(answers) => sendMessage({
            type: 'question_answers',
            answers
          })}
        />
      );

    case 'answer_summary':
      return <AnswerSummary answers={message.answers} />;

    case 'plan':
      return (
        <PlanDisplay
          plan={message.plan}
          onImplement={() => switchToBuildMode(message.plan)}
        />
      );

    case 'tool_call':
      return <ToolProgress tool={message.tool} />;
  }
}
```

## Data Models

### Question Types

```typescript
// types/planner-types.ts

export type QuestionType = 'single' | 'multi' | 'text';

export interface PlannerQuestion {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[];        // For single/multi types
  allowCustom?: boolean;     // Show "Other" input (default: true for single/multi)
}

export interface QuestionResponse {
  questionId: string;
  selectedOptions?: string[];  // For single/multi
  customValue?: string;        // For "Other" or text type
  skipped: boolean;
}
```

### Plan Types

```typescript
export interface PlanStep {
  description: string;
  subSteps?: string[];
  suggestedNodes?: string[];   // Node names from discovery (for implementation)
}

export interface PlanOutput {
  summary: string;             // Bold headline
  trigger: string;             // What starts the workflow
  steps: PlanStep[];
  additionalSpecs?: string[];
  discoveryContext?: DiscoveryContext;  // Reused from discovery for implementation
}
```

### Planner Subgraph State

```typescript
export interface PlannerSubgraphState {
  // Input mode
  mode: 'fresh' | 'with_answers' | 'refine';
  userRequest: string;
  messages: BaseMessage[];

  // Q&A phase
  questions: PlannerQuestion[];
  answers: QuestionResponse[];

  // Discovery integration
  discoveryContext: DiscoveryContext | null;

  // Output
  plan: PlanOutput | null;

  // Carry-over for refinement
  existingPlan: PlanOutput | null;
}
```

### Parent Graph State Additions

```typescript
// Additions to ParentGraphState
interface ParentGraphState {
  // ... existing fields

  // Mode
  mode: 'build' | 'plan';

  // Planner HITL state
  pendingQuestions?: PlannerQuestion[];
  planOutput?: PlanOutput;
  plannerPhase?: PlannerPhase;
}
```

### Coordination Log Addition

```typescript
// types/coordination.ts

export type SubgraphPhase = 'discovery' | 'builder' | 'configurator' | 'planner';

export interface PlannerPhaseMetadata {
  questionsAsked: number;
  questionsAnswered: number;
  questionsSkipped: number;
  planGenerated: boolean;
}
```

## Planner Subgraph Implementation

### Subgraph Structure

```typescript
// subgraphs/planner.subgraph.ts

export class PlannerSubgraph implements BaseSubgraph<...> {

  transformInput(parentState: ParentGraphState): PlannerSubgraphInput {
    const lastUserMessage = getLastUserMessage(parentState.messages);

    // Determine mode based on parent state
    let mode: 'fresh' | 'with_answers' | 'refine';

    if (isAnswersMessage(lastUserMessage)) {
      mode = 'with_answers';
    } else if (parentState.planOutput && parentState.plannerPhase === 'plan_displayed') {
      mode = 'refine';
    } else {
      mode = 'fresh';
    }

    return {
      mode,
      userRequest: lastUserMessage?.content?.toString() ?? '',
      existingPlan: parentState.planOutput ?? null,
      discoveryContext: parentState.discoveryContext ?? null,
      questions: parentState.pendingQuestions ?? [],
      answers: isAnswersMessage(lastUserMessage)
        ? parseAnswers(lastUserMessage)
        : [],
    };
  }

  transformOutput(result: PlannerSubgraphOutput, parentState: ParentGraphState) {
    // Derive plannerPhase from questions and plan presence
    const plannerPhase = result.plan
      ? 'plan_displayed'
      : result.questions.length > 0
        ? 'waiting_for_answers'
        : 'idle';

    return {
      planOutput: result.plan,
      discoveryContext: result.discoveryContext,
      pendingQuestions: result.questions,
      plannerPhase,
      coordinationLog: [{
        phase: 'planner',
        status: 'completed',
        timestamp: Date.now(),
        metadata: {
          questionsAsked: result.questions.length,
          questionsAnswered: result.answers.filter(a => !a.skipped).length,
        },
      }],
    };
  }

  create(config: PlannerSubgraphConfig) {
    const { parsedNodeTypes, llm, logger, featureFlags } = config;

    // Reuse discovery tools + add planner-specific ones
    const tools = [
      createNodeSearchTool(parsedNodeTypes),
      createNodeDetailsTool(parsedNodeTypes),
      createGetDocumentationTool(),
      createGenerateQuestionsTool(),  // NEW
      createSubmitPlanTool(),          // NEW
    ];

    return new StateGraph(PlannerSubgraphState)
      .addNode('route_by_mode', routeByMode)
      .addNode('analyze_request', analyzeAndGenerateQuestions)
      .addNode('emit_questions', emitQuestionsToUser)
      .addNode('process_answers', processUserAnswers)
      .addNode('generate_plan', generatePlanWithDiscovery)
      .addNode('refine_plan', refinePlanWithUserFeedback)
      .addNode('submit_plan', submitFinalPlan)

      .addEdge(START, 'route_by_mode')
      .addConditionalEdges('route_by_mode', (state) => state.next)

      // Fresh flow
      .addConditionalEdges('analyze_request', (state) =>
        state.questions.length > 0 ? 'emit_questions' : 'generate_plan'
      )
      .addEdge('emit_questions', END)  // Pause for user answers

      // Answer flow
      .addEdge('process_answers', 'generate_plan')
      .addEdge('generate_plan', 'submit_plan')

      // Refine flow
      .addEdge('refine_plan', 'submit_plan')

      .addEdge('submit_plan', END)
      .compile();
  }
}
```

### Planner Prompt

Unlike the Discovery agent which has "NEVER ask clarifying questions" rule, the Planner agent is designed to ask questions:

```typescript
// prompts/agents/planner.prompt.ts

const PLANNER_ROLE = `You are a Planning Agent for n8n AI Workflow Builder.

YOUR ROLE: Help users clarify their workflow requirements through targeted questions,
then generate a detailed implementation plan.

Unlike the Discovery Agent, you SHOULD ask clarifying questions to understand:
- What triggers the workflow
- What services/integrations are involved
- What the expected outputs are
- Any specific requirements or constraints`;

const QUESTION_GENERATION = `Generate 1-5 clarifying questions based on what's unclear.

Question types:
- **single**: Radio buttons, one answer (use for mutually exclusive choices)
- **multi**: Checkboxes, multiple answers (use when multiple options can apply)
- **text**: Free-form input (use sparingly, only when options can't be predefined)

Guidelines:
- Ask the MOST IMPORTANT questions first
- Provide 3-4 predefined options when possible
- Include an "Other" option for flexibility
- Skip questions if the user's request is already clear
- Maximum 5 questions total`;

const PLAN_OUTPUT = `After collecting answers, generate a plan with:

1. **Summary**: One bold sentence describing the workflow
2. **Trigger**: What initiates the workflow (schedule, webhook, event, etc.)
3. **Steps**: Numbered list of workflow steps
   - Include sub-steps for complex operations
   - Reference specific n8n nodes when known
4. **Additional specs**: Any constraints or requirements

Use discovery tools (search_nodes, get_node_details) to identify
the correct n8n nodes for each step.`;
```

## "Implement the Plan" Transition

When user clicks "Implement the plan", the plan context is passed to Build mode:

```typescript
// Frontend sends:
{
  mode: 'build',
  type: 'implement_plan',
  planContext: {
    summary: '...',
    steps: [...],
    discoveryContext: {...}  // Reuse discovered nodes - skip redundant discovery
  }
}

// Supervisor receives this and routes to builder
// with the plan context pre-populated
```

The `discoveryContext` from planning is reused, so the builder doesn't need to re-discover nodes.

## Credits & Billing

- **One planning message = 1 credit**
- This includes:
  - Initial question generation
  - Plan generation
  - Each refinement message

## Open Questions

1. **Plan detail level**: Should the plan be high-level only, or include a node-by-node outline?
   - *Current direction*: Include node-level detail for better implementation accuracy

2. **Question persistence**: Should questions/answers be saved for future reference?

3. **Plan templates**: Should common workflow patterns have pre-built question sets?

4. **Skip all questions**: Should there be a "Skip all" button to go straight to plan generation?

## Future Considerations

- Automatic mode suggestion based on request complexity
- Plan sharing and collaboration features
- Plan versioning and history
- Integration with workflow templates
- Analytics on plan-to-implementation success rate
- Pre-built question templates for common workflow types

## Success Metrics

1. **Reduction in iteration cycles**: Fewer back-and-forth messages to achieve desired workflow
2. **First-time success rate**: Higher percentage of workflows that meet user expectations on first generation
3. **User satisfaction**: Improved NPS scores for workflow building experience
4. **Credit efficiency**: Better value per credit spent
5. **Plan-to-implementation rate**: Percentage of plans that get implemented

## Related Documents

- AI Workflow Builder architecture: `packages/@n8n/ai-workflow-builder.ee/`
- Multi-agent subgraphs: `packages/@n8n/ai-workflow-builder.ee/src/multi-agent-workflow-subgraphs.ts`
- Discovery subgraph: `packages/@n8n/ai-workflow-builder.ee/src/subgraphs/discovery.subgraph.ts`
- Design system components: `packages/@n8n/design-system/`
