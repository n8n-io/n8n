import { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import { SQL_NODES } from './constants';
import type { FlaggedLocation } from './types';

export async function reportSqlInjection(workflows: WorkflowEntity[]) {
	const locations = workflows.reduce<FlaggedLocation[]>((acc, workflow) => {
		workflow.nodes.forEach((node) => {
			if (
				SQL_NODES.includes(node.type) &&
				node.parameters !== undefined &&
				node.parameters.operation === 'executeQuery' &&
				typeof node.parameters.query === 'string' &&
				node.parameters.query.startsWith('=')
			) {
				acc.push({
					workflowId: workflow.id.toString(),
					workflowName: workflow.name,
					nodeId: node.id,
					nodeName: node.name,
					nodeType: node.type,
				});
			}
		});

		return acc;
	}, []);

	if (locations.length === 0) return null;

	return {
		risk: 'SQL injection risk',
		description:
			'These workflows contain at least one SQL node whose "Execute Query" field contains an expression. Building a query with an expression that evaluates arbitrary data may lead to a SQL injection attack. Consider validating the input used to build the query.',
		locations,
	};
}
