import { Container } from '@n8n/di';
import { isToolType } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';

/** The type an agent node tool runs as: its `…Tool` variant when one exists, else the type itself. */
export function resolveToolNodeType(nodeType: string, nodeTypeVersion: number): string {
	if (isToolType(nodeType)) return nodeType;

	const toolNodeType = `${nodeType}Tool`;
	try {
		Container.get(NodeTypes).getByNameAndVersion(toolNodeType, nodeTypeVersion);
		return toolNodeType;
	} catch {
		return nodeType;
	}
}
