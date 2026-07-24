import type { SubworkflowExecutionStarted } from '@n8n/api-types/push/execution';
import { useSubworkflowProgressStore } from '@/app/stores/subworkflowProgress.store';

export async function subworkflowExecutionStarted({ data }: SubworkflowExecutionStarted) {
	useSubworkflowProgressStore().setStarted(data);
}
