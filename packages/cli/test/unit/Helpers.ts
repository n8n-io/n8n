import type { INodeTypeData } from 'n8n-workflow';
import { mockInstance } from '../integration/shared/utils';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';

/**
 * Ensure all pending promises settle. The promise's `resolve` is placed in
 * the macrotask queue and so called at the next iteration of the event loop
 * after all promises in the microtask queue have settled first.
 */
export const flushPromises = async () => new Promise(setImmediate);

export function mockNodeTypesData(
	nodeNames: string[],
	options?: {
		addTrigger?: boolean;
	},
) {
	return nodeNames.reduce<INodeTypeData>((acc, nodeName) => {
		return (
			(acc[`n8n-nodes-base.${nodeName}`] = {
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

export function setSchedulerAsLoadedNode() {
	const nodesAndCredentials = mockInstance(LoadNodesAndCredentials);

	Object.assign(nodesAndCredentials, {
		loadedNodes: mockNodeTypesData(['scheduleTrigger'], {
			addTrigger: true,
		}),
		known: { nodes: {}, credentials: {} },
		types: { nodes: [], credentials: [] },
	});
}
