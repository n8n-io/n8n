import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { AiGatewayService } from '@/services/ai-gateway.service';

import { McpRegistryCapabilities } from '../mcp-registry-capabilities';

describe('McpRegistryCapabilities', () => {
	it.each([
		['default', undefined, true],
		['default', ['supabase-oauth2-credentials'], true],
		['default', ['n8n-cloud'], false],
		['cloud', ['supabase-oauth2-credentials'], true],
		['cloud', ['n8n-cloud'], true],
		['cloud', ['n8n-cloud', 'unsupported-capability'], false],
	])('checks capabilities for a %s deployment', (deploymentType, required, expected) => {
		const globalConfig = mock<GlobalConfig>({ deployment: { type: deploymentType } });
		const capabilities = new McpRegistryCapabilities(globalConfig, mock<AiGatewayService>());

		expect(capabilities.supports(required)).toBe(expected);
	});

	it.each([true, false])(
		'supports the Gateway credits capability only while Gateway credits are on (%s)',
		(enabled) => {
			const globalConfig = mock<GlobalConfig>({ deployment: { type: 'default' } });
			const aiGatewayService = mock<AiGatewayService>({ isEnabled: () => enabled });
			const capabilities = new McpRegistryCapabilities(globalConfig, aiGatewayService);

			expect(capabilities.supports(['n8n-connect'])).toBe(enabled);
		},
	);
});
