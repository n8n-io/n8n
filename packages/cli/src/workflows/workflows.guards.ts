import type { ListQuery } from '@/requests';

export function withSharing(
	workflows: ListQuery.Workflow.Plain[] | ListQuery.Workflow.WithSharing[],
): workflows is ListQuery.Workflow.WithSharing[] {
	return workflows.some((s) => 'shared' in s);
}
