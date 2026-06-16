import type { SubworkflowNodeProgress } from '@n8n/api-types/push/execution';
import { useSubworkflowProgressStore } from '@/app/stores/subworkflowProgress.store';

export async function subworkflowNodeProgress({ data }: SubworkflowNodeProgress) {
	useSubworkflowProgressStore().updateProgress(data);
}
