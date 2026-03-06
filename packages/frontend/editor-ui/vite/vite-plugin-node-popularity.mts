import { promises as fs } from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

const VIRTUAL_MODULE_ID = 'virtual:node-popularity-data';
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID;

export function nodePopularityPlugin(): Plugin {
	return {
		name: 'node-popularity-plugin',
		resolveId(id) {
			if (id === VIRTUAL_MODULE_ID) {
				return RESOLVED_VIRTUAL_MODULE_ID;
			}
		},
		async load(id) {
			if (id === RESOLVED_VIRTUAL_MODULE_ID) {
				// Try to load the data from the data directory
				const dataPath = path.join(process.cwd(), 'data', 'node-popularity.json');

				try {
					const data = await fs.readFile(dataPath, 'utf-8');
					return `export default ${data}`;
				} catch (error) {
					// If file doesn't exist, return empty array
					console.warn('Node popularity data not found at', dataPath, '- using empty array');
					return 'export default []';
				}
			}
		},
	};
}
