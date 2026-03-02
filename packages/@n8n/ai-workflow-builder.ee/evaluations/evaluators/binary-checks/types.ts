import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';

import type { LlmCallLimiter } from '../../harness/harness-types';

export interface BinaryCheckResult {
	pass: boolean;
	comment?: string;
}

export interface BinaryCheckContext {
	prompt: string;
	nodeTypes: INodeTypeDescription[];
	annotations?: Record<string, unknown>;
	llm?: BaseChatModel;
	llmCallLimiter?: LlmCallLimiter;
	timeoutMs?: number;
}

export interface BinaryCheck {
	name: string;
	kind: 'deterministic' | 'llm';
	run(workflow: SimpleWorkflow, ctx: BinaryCheckContext): Promise<BinaryCheckResult>;
}

// Re-export for convenience
export type { SimpleWorkflow };
