import { getNodeTypes, getNodeTypeVersions } from '@n8n/rest-api-client/api/nodeTypes';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { WorkerState } from '../types';

function getNodeTypeId(name: string, version: number): string {
	return `${name}@${version}`;
}

function getNodeTypeVersionsFromDescription(nodeType: INodeTypeDescription): number[] {
	const version = nodeType.version;
	if (typeof version === 'number') {
		return [version];
	}
	if (Array.isArray(version)) {
		return version;
	}
	return [1];
}

export async function loadNodeTypes(state: WorkerState): Promise<void> {
	if (!state.promiser) {
		throw new Error('Database not initialized');
	}

	const { promiser, dbId, baseUrl } = state;

	// Check if the database is empty
	const countResult = await promiser('exec', {
		dbId,
		sql: 'SELECT COUNT(*) as count FROM nodeTypes',
		returnValue: 'resultRows',
	});

	if (countResult.type === 'error') {
		throw new Error(countResult.result.message);
	}

	const resultRows = countResult.result.resultRows as unknown[][] | undefined;
	const isEmpty = resultRows?.[0]?.[0] === 0;

	console.log('IN WORKER', resultRows);

	// if (isEmpty) {
	// 	// Load all node types and store them
	// 	const nodeTypes: INodeTypeDescription[] = await getNodeTypes(baseUrl);

	// 	for (const nodeType of nodeTypes) {
	// 		const versions = getNodeTypeVersionsFromDescription(nodeType);
	// 		for (const version of versions) {
	// 			const id = getNodeTypeId(nodeType.name, version);
	// 			await promiser('exec', {
	// 				dbId,
	// 				sql: 'INSERT OR REPLACE INTO nodeTypes (id, data) VALUES (?, ?)',
	// 				bind: [id, JSON.stringify(nodeType)],
	// 			});
	// 		}
	// 	}
	// } else {
	// 	// Load node type versions and check which have been added or removed
	// 	const serverVersions: string[] = await getNodeTypeVersions(baseUrl);
	// 	const serverVersionSet = new Set(serverVersions);

	// 	// Get existing node type IDs from the database
	// 	const existingResult = await promiser('exec', {
	// 		dbId,
	// 		sql: 'SELECT id FROM nodeTypes',
	// 		returnValue: 'resultRows',
	// 	});

	// 	if (existingResult.type === 'error') {
	// 		throw new Error(existingResult.result.message);
	// 	}

	// 	const existingRows = existingResult.result.resultRows as unknown[][] | undefined;
	// 	const existingIds = new Set((existingRows ?? []).map((row) => row[0] as string));

	// 	// Find added node types (in server but not in DB)
	// 	const addedVersions = serverVersions.filter((id) => !existingIds.has(id));

	// 	// Find removed node types (in DB but not on server)
	// 	const removedVersions = [...existingIds].filter((id) => !serverVersionSet.has(id));

	// 	// Remove deleted node types
	// 	for (const id of removedVersions) {
	// 		await promiser('exec', {
	// 			dbId,
	// 			sql: 'DELETE FROM nodeTypes WHERE id = ?',
	// 			bind: [id],
	// 		});
	// 	}

	// 	// If there are added node types, fetch all and insert the new ones
	// 	if (addedVersions.length > 0) {
	// 		const nodeTypes: INodeTypeDescription[] = await getNodeTypes(baseUrl);

	// 		for (const nodeType of nodeTypes) {
	// 			const versions = getNodeTypeVersionsFromDescription(nodeType);
	// 			for (const version of versions) {
	// 				const id = getNodeTypeId(nodeType.name, version);
	// 				if (addedVersions.includes(id)) {
	// 					await promiser('exec', {
	// 						dbId,
	// 						sql: 'INSERT OR REPLACE INTO nodeTypes (id, data) VALUES (?, ?)',
	// 						bind: [id, JSON.stringify(nodeType)],
	// 					});
	// 				}
	// 			}
	// 		}
	// 	}
	// }
}
