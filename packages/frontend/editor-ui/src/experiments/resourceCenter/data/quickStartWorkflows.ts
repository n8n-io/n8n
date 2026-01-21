/**
 * Quick Start Workflows
 * Static workflow definitions for the Resource Center quick start section
 */

import type { WorkflowDataCreate } from '@n8n/rest-api-client';
import { READY_TO_RUN_AI_WORKFLOW } from '@/features/workflows/readyToRun/workflows/aiWorkflow';
import { READY_TO_RUN_WORKFLOW_V5 } from '@/experiments/readyToRunWorkflowsV2/workflows/ai-workflow-v5';

export interface QuickStartWorkflow {
	id: string;
	name: string;
	description: string;
	workflow: WorkflowDataCreate;
	// Node types for card icons - extracted from workflow.nodes
	nodeTypes: string[];
	// Workflow preview image URL
	previewImageUrl?: string;
	// Number of nodes in workflow
	nodeCount?: number;
}

export const quickStartWorkflows: QuickStartWorkflow[] = [
	{
		id: 'summarize-the-news',
		name: 'Summarize the news',
		description: 'Get AI-powered news summaries from top sources',
		workflow: READY_TO_RUN_AI_WORKFLOW,
		nodeTypes: ['n8n-nodes-base.rssFeedReadTool', '@n8n/n8n-nodes-langchain.agent'],
	},
	{
		id: 'chat-with-the-news',
		name: 'Chat with the news',
		description: 'Chat with an AI agent about the latest news',
		workflow: READY_TO_RUN_WORKFLOW_V5,
		nodeTypes: ['@n8n/n8n-nodes-langchain.chatTrigger', '@n8n/n8n-nodes-langchain.agent'],
	},
];
