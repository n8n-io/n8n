import type { SourcePackage } from '@n8n/node-sdk/registry';
import path from 'node:path';

import { passItems } from './nodes/no-op/actions/pass';

export { passItems };

/** The core nodes: every n8n ships them, and the engine and the flow SDK may name them by type. */
export const nodesCore: SourcePackage = {
	name: '@n8n/nodes-core',
	dir: path.resolve(__dirname, '..'),
	actions: [passItems],
	triggers: [],
	natives: [],
};
