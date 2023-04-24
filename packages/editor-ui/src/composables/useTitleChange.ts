import { WorkflowTitleStatus } from '@/Interface';

export function useTitleChange() {
	return {
		titleSet(workflow: string, status: WorkflowTitleStatus) {
			let icon = '⚠️';
			if (status === 'EXECUTING') {
				icon = '🔄';
			} else if (status === 'IDLE') {
				icon = '▶️';
			}

			window.document.title = `n8n - ${icon} ${workflow}`;
		},
		titleReset() {
			document.title = 'n8n - Workflow Automation';
		},
	};
}
