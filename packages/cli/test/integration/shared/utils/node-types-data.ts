import { readFileSync } from 'fs';
import { UnrecognizedNodeTypeError } from 'n8n-core';
import type { INodeType, INodeTypeData, NodeLoadingDetails } from 'n8n-workflow';
import path from 'path';

// Resolves to packages/
const BASE_DIR = path.resolve(__dirname, '../../../../..');

export function loadNodesFromDist(nodeNames: string[]): INodeTypeData {
	const nodeTypes: INodeTypeData = {};
	const knownNodes = JSON.parse(
		readFileSync(path.join(BASE_DIR, 'nodes-base/dist/known/nodes.json'), 'utf-8'),
	) as Record<string, NodeLoadingDetails>;

	for (const nodeName of nodeNames) {
		const loadInfo = knownNodes[nodeName.replace('n8n-nodes-base.', '')];
		if (!loadInfo) {
			throw new UnrecognizedNodeTypeError('n8n-nodes-base', nodeName);
		}
		const nodeDistPath = path.join(BASE_DIR, 'nodes-base', loadInfo.sourcePath);
		const node = new (require(nodeDistPath)[loadInfo.className])() as INodeType;
		nodeTypes[nodeName] = { sourcePath: '', type: node };
	}

	return nodeTypes;
}

export function mockNodeTypesData(
	nodeNames: string[],
	options?: {
		addTrigger?: boolean;
	},
) {
	return nodeNames.reduce<INodeTypeData>((acc, nodeName) => {
		const fullName = nodeName.indexOf('.') === -1 ? `n8n-nodes-base.${nodeName}` : nodeName;

		return (
			(acc[fullName] = {
				sourcePath: '',
				type: {
					description: {
						displayName: nodeName,
						name: nodeName,
						group: [],
						description: '',
						version: 1,
						defaults: {},
						inputs: [],
						outputs: [],
						properties: [],
					},
					trigger: options?.addTrigger ? async () => undefined : undefined,
				},
			}),
			acc
		);
	}, {});
}
