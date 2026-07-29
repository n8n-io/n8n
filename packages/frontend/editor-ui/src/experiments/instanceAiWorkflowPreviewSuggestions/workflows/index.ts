import type { PreviewWorkflow } from './types';
import { scoreMyLeadsWorkflow } from './score-my-leads';
import { processInvoicesWorkflow } from './process-invoices';
import { whatsappSupportWorkflow } from './whatsapp-support';
import { scheduleSocialPostsWorkflow } from './schedule-social-posts';

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
	'whatsapp-support': whatsappSupportWorkflow,
	'schedule-social-posts': scheduleSocialPostsWorkflow,
};

export function getPreviewWorkflow(workflowFile: string): PreviewWorkflow | undefined {
	return workflowRegistry[workflowFile];
}
