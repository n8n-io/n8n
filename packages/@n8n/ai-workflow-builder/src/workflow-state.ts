import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, END } from '@langchain/langgraph';

import type { SimpleWorkflow } from './types';

export const WorkflowState = Annotation.Root({
	messages: Annotation<BaseMessage[]>({
		reducer: (x, y) => x.concat(y),
	}),
	// The original prompt from the user.
	prompt: Annotation<string>({ reducer: (x, y) => y ?? x ?? '' }),
	// The list of logically derived workflow steps.
	steps: Annotation<string[]>({ reducer: (x, y) => y ?? x ?? [] }),
	// The list of candidate or selected n8n node names.
	nodes: Annotation<string[]>({ reducer: (x, y) => y ?? x ?? [] }),
	// The JSON representation of the workflow being built.
	workflowJSON: Annotation<SimpleWorkflow>({
		reducer: (x, y) => y ?? x ?? { nodes: [], connections: {} },
	}),
	// Whether the user prompt is a workflow prompt.
	isWorkflowPrompt: Annotation<boolean>({ reducer: (x, y) => y ?? x ?? false }),
	// The next phase to be executed in the workflow graph.
	next: Annotation<string>({ reducer: (x, y) => y ?? x ?? END, default: () => END }),
});
