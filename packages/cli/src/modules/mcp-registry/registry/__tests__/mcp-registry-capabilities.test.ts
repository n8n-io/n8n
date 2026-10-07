import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { AiGatewayService } from '@/services/ai-gateway.service';

import { McpRegistryCapabilities } from '../mcp-registry-capabilities';

function createCapabilities(deploymentType: string, isN8nConnectEnabled = false) {
	const globalConfig = mock<GlobalConfig>({ deployment: { type: deploymentType } });
	const aiGatewayService = mock<AiGatewayService>({
		isEnabled: vi.fn().mockReturnValue(isN8nConnectEnabled),
	});
	return {
		capabilities: new McpRegistryCapabilities(globalConfig, aiGatewayService),
		aiGatewayService,
	};
}

describe('McpRegistryCapabilities', () => {
	it.each([
		['default', undefined, true],
		['default', ['supabase-oauth2-credentials'], true],
		['default', ['n8n-cloud'], false],
		['cloud', ['supabase-oauth2-credentials'], true],
		['cloud', ['n8n-cloud'], true],
		['cloud', ['n8n-cloud', 'unsupported-capability'], false],
	])('checks capabilities for a %s deployment', (deploymentType, required, expected) => {
		const { capabilities } = createCapabilities(deploymentType);

		expect(capabilities.supports(required)).toBe(expected);
	});

	it.each([
		[true, true],
		[false, false],
	])('supports n8n-connect only while n8n Connect is on (on: %s)', (isEnabled, expected) => {
		const { capabilities } = createCapabilities('default', isEnabled);

		expect(capabilities.supports(['n8n-connect'])).toBe(expected);
	});

	it('reads the n8n Connect state on every check', () => {
		const { capabilities, aiGatewayService } = createCapabilities('default', false);
		expect(capabilities.supports(['n8n-connect'])).toBe(false);

		aiGatewayService.isEnabled.mockReturnValue(true);

		expect(capabilities.supports(['n8n-connect'])).toBe(true);
	});
});
