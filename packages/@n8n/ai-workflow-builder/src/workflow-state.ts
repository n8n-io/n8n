import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { IRunExecutionData } from 'n8n-workflow';

import type { SimpleWorkflow } from './types';

export const WorkflowState = Annotation.Root({
	messages: Annotation<BaseMessage[]>({
		reducer: messagesStateReducer,
		default: () => [],
	}),
	// The original prompt from the user.
	prompt: Annotation<string>({ reducer: (x, y) => y ?? x ?? '' }),
	// The JSON representation of the workflow being built.
	workflowJSON: Annotation<SimpleWorkflow>({
		reducer: (x, y) => y ?? x ?? { nodes: [], connections: {} },
	}),
	// Whether the user prompt is a workflow prompt.
	isWorkflowPrompt: Annotation<boolean>({ reducer: (x, y) => y ?? x ?? false }),
	// The execution data from the last workflow run.
	executionData: Annotation<IRunExecutionData['resultData'] | undefined>({
		reducer: (x, y) => y ?? x ?? undefined,
	}),
});
