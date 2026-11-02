import { NODE_ID_MAX_LENGTH } from '@n8n/constants';
import { UserError, type INode } from 'n8n-workflow';

export class TriggerNodeIdTooLongError extends UserError {
	readonly affectedNodes: ReadonlyArray<Readonly<Pick<INode, 'id' | 'name'>>>;

	constructor(nodes: ReadonlyArray<Pick<INode, 'id' | 'name'>>) {
		const affectedNodes = nodes.map(({ id, name }) => ({ id, name }));
		const names = affectedNodes.map((node) => `"${node.name}"`).join(', ');
		const subject =
			affectedNodes.length === 1
				? `trigger ${names} has a node ID`
				: `triggers ${names} have node IDs`;
		super(
			`Cannot publish workflow: ${subject} longer than ${NODE_ID_MAX_LENGTH} characters. Remove and re-add the affected nodes to give them new IDs.`,
		);
		this.affectedNodes = affectedNodes;
	}
}
