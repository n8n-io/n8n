import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { McpRegistryCapabilities } from '../mcp-registry-capabilities';

describe('McpRegistryCapabilities', () => {
	it.each([
		['default', undefined, true],
		['default', ['n8n-cloud'], false],
		['cloud', ['n8n-cloud'], true],
		['cloud', ['n8n-cloud', 'unsupported-capability'], false],
	])('checks capabilities for a %s deployment', (deploymentType, required, expected) => {
		const globalConfig = mock<GlobalConfig>({ deployment: { type: deploymentType } });
		const capabilities = new McpRegistryCapabilities(globalConfig);

		expect(capabilities.supports(required)).toBe(expected);
	});
});
