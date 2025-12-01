/**
 * Stub for NodeTypes service
 * This manages node type definitions and their capabilities
 */

import { Service } from '@n8n/di';
import type { INodeType, INodeTypeDescription, IDataObject } from 'n8n-workflow';

@Service()
export class NodeTypes {
	getByName(_nodeType: string): INodeType {
		throw new Error('NodeTypes.getByName not yet implemented in trigger-service');
	}

	getByNameAndVersion(_nodeType: string, _version?: number): INodeType {
		// Return a minimal stub node type
		return {
			description: {
				displayName: 'Unknown',
				name: 'unknown',
				group: [],
				version: 1,
				description: 'Node type not available in trigger-service',
				defaults: {},
				inputs: [],
				outputs: [],
				properties: [],
			} as INodeTypeDescription,
		} as INodeType;
	}

	getKnownTypes(): IDataObject {
		return {};
	}
}
