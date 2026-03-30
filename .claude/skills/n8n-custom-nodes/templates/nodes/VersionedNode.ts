/**
 * TEMPLATE: Versioned Node (VersionedNodeType wrapper)
 *
 * When a node undergoes major changes that require different implementations,
 * use VersionedNodeType to maintain backward compatibility. Each version is a
 * separate class, and this wrapper routes to the correct one.
 *
 * File structure for versioned nodes:
 *   ServiceName/
 *     ServiceName.node.ts       ← This file (the wrapper)
 *     ServiceName.node.json     ← Codex metadata
 *     servicename.svg           ← Icon
 *     v1/
 *       ServiceNameV1.node.ts   ← Version 1 implementation
 *     v2/
 *       ServiceNameV2.node.ts   ← Version 2 implementation
 *       helpers/
 *       methods/
 *
 * Replace all occurrences of:
 *   - __ServiceName__     → Your service class name (PascalCase)
 *   - __serviceName__     → Your service internal name (camelCase)
 *   - __servicename__     → Icon filename (lowercase)
 */
import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { __ServiceName__V1 } from './v1/__ServiceName__V1.node';
import { __ServiceName__V2 } from './v2/__ServiceName__V2.node';

export class __ServiceName__ extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: '__ServiceName__',
			name: '__serviceName__',
			icon: 'file:__servicename__.svg',
			group: ['transform'],
			description: 'Interact with __ServiceName__',
			defaultVersion: 2, // New workflows get this version
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new __ServiceName__V1(baseDescription),
			2: new __ServiceName__V2(baseDescription),
			// For minor updates within V2:
			// 2.1: new __ServiceName__V2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}

// =====================================================================
// VERSION IMPLEMENTATION TEMPLATE (v1/ServiceNameV1.node.ts)
// =====================================================================

/*
import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeBaseDescription,
  INodeTypeDescription,
  IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class __ServiceName__V1 implements INodeType {
  description: INodeTypeDescription;

  constructor(baseDescription: INodeTypeBaseDescription) {
    this.description = {
      ...baseDescription,
      version: 1,
      defaults: {
        name: '__ServiceName__',
      },
      inputs: [NodeConnectionTypes.Main],
      outputs: [NodeConnectionTypes.Main],
      properties: [
        // V1 properties
      ],
    };
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // V1 implementation
    const items = this.getInputData();
    return [items];
  }
}
*/
