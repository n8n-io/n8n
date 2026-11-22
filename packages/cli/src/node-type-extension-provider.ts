import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

/** Lets a module add to a node type when `NodeTypes` resolves it. A provider never mutates its arguments. */
export interface NodeTypeExtensionProvider {
	/** Returns an extended copy, or `description` itself when the provider adds nothing. */
	extendDescription(nodeTypeName: string, description: INodeTypeDescription): INodeTypeDescription;
	/** Returns an extended copy, or `nodeType` itself when the provider adds nothing. */
	extendNodeType(nodeTypeName: string, nodeType: INodeType): INodeType;
}
