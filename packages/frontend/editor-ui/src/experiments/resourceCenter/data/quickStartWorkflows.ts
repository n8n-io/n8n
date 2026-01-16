/**
 * Quick Start Workflows
 * Static workflow definitions for the Resource Center quick start section
 */

import type { WorkflowDataCreate } from '@n8n/rest-api-client';
import { READY_TO_RUN_AI_WORKFLOW } from '@/features/workflows/readyToRun/workflows/aiWorkflow';

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

// Using READY_TO_RUN_AI_WORKFLOW as placeholder for all quick start templates
// TODO: Replace with actual workflow definitions
export const quickStartWorkflows: QuickStartWorkflow[] = [
	{
		id: 'quick-start-ai-agent',
		name: 'AI Agent workflow',
		description: 'Get started with AI agents - summarize news with AI',
		workflow: READY_TO_RUN_AI_WORKFLOW,
		nodeTypes: ['n8n-nodes-base.rssFeedReadTool', '@n8n/n8n-nodes-langchain.agent'],
	},
	{
		id: 'quick-start-ai-agent',
		name: 'AI Agent workflow',
		description: 'Get started with AI agents - summarize news with AI',
		workflow: READY_TO_RUN_AI_WORKFLOW,
		nodeTypes: ['n8n-nodes-base.rssFeedReadTool', '@n8n/n8n-nodes-langchain.agent'],
	},
	{
		id: 'quick-start-ai-agent',
		name: 'AI Agent workflow',
		description: 'Get started with AI agents - summarize news with AI',
		workflow: READY_TO_RUN_AI_WORKFLOW,
		nodeTypes: ['n8n-nodes-base.rssFeedReadTool', '@n8n/n8n-nodes-langchain.agent'],
	},
	{
		id: 'quick-start-ai-agent',
		name: 'AI Agent workflow',
		description: 'Get started with AI agents - summarize news with AI',
		workflow: READY_TO_RUN_AI_WORKFLOW,
		nodeTypes: ['n8n-nodes-base.rssFeedReadTool', '@n8n/n8n-nodes-langchain.agent'],
	},
];
