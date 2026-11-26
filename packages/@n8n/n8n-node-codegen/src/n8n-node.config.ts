import path from 'node:path';

import type { GenerateConfig } from './types';

const PACKAGE_DIR = path.resolve(__dirname, '..');

export const N8N_NODE_CONFIG: GenerateConfig = {
	envelopeFile: path.resolve(PACKAGE_DIR, '../../cli/src/public-api/v1/openapi.yml'),
	routesFile: path.resolve(PACKAGE_DIR, 'dist/routes.yml'),
	overridesFile: path.resolve(PACKAGE_DIR, '../../nodes-base/nodes/N8n/v2/overrides.ts'),
	outputFile: path.resolve(
		PACKAGE_DIR,
		'../../nodes-base/nodes/N8n/v2/generated/properties.generated.ts',
	),
	spec: {
		ignoredHeaderParameters: ['Idempotency-Key'],
		cursorParameter: 'cursor',
		offsetParameter: 'offset',
		limitParameter: 'limit',
		nextCursorProperty: 'nextCursor',
		itemsProperty: 'data',
	},
};
