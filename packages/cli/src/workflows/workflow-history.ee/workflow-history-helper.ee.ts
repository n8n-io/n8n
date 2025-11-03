import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

export function isWorkflowHistoryEnabled() {
	return Container.get(GlobalConfig).workflowHistory.enabled;
}

// Time in hours
export function getWorkflowHistoryPruneTime(): number {
	return Container.get(GlobalConfig).workflowHistory.pruneTime;
}
