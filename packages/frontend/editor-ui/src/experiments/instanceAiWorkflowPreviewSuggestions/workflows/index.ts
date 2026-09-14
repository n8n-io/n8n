import type { PreviewWorkflow } from './types';
import { scoreMyLeadsWorkflow } from './score-my-leads';
import { processInvoicesWorkflow } from './process-invoices';
import { scheduleSocialPostsWorkflow } from './schedule-social-posts';
import { telegramAgentWorkflow } from './telegram-agent';

export type {
	PreviewWorkflow,
	PreviewWorkflowNode,
	PreviewWorkflowConnection,
	PreviewVisualization,
	PreviewVisualizationType,
	PreviewOutputVisualization,
	CrmCycleConfig,
	CrmCycleVariant,
} from './types';

const workflowRegistry: Record<string, PreviewWorkflow> = {
	'score-my-leads': scoreMyLeadsWorkflow,
	'process-invoices': processInvoicesWorkflow,
	'schedule-social-posts': scheduleSocialPostsWorkflow,
	'telegram-agent': telegramAgentWorkflow,
};

export function getPreviewWorkflow(workflowFile: string): PreviewWorkflow | undefined {
	return workflowRegistry[workflowFile];
}
