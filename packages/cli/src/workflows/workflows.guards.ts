import type { ListQuery } from '@/requests';

type Plain = ListQuery.Workflow.Plain;
type WithSharing = ListQuery.Workflow.WithSharing;

export function withSharing(workflows: Plain[] | WithSharing[]): workflows is WithSharing[] {
	return workflows.some((w) => 'shared' in w);
}
