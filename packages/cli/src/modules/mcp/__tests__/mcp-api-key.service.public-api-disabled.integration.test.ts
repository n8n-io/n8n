import { Container } from '@n8n/di';

import { createOwner } from '@test-integration/db/users';
import * as utils from '@test-integration/utils';

import { McpServerApiKeyService } from '../mcp-api-key.service';

// Regression guard for IAM-574: ApiKeyAuthStrategy must be registered regardless
// of whether the public API is enabled, otherwise MCP API keys stop working on
// instances that disable the public REST API. Omitting 'publicApi' from
// endpointGroups mirrors a production instance where isApiEnabled() returns
// false — the MCP endpoint group is still set up so we can exercise the real
// strategy-registration wiring.
utils.setupTestServer({ modules: ['mcp'], endpointGroups: ['mcp'] });

describe('McpServerApiKeyService.verifyApiKey with public API disabled', () => {
	it('still authenticates valid MCP API keys', async () => {
		const service = Container.get(McpServerApiKeyService);
		const owner = await createOwner();
		const { apiKey } = await service.createMcpServerApiKey(owner);

		const result = await service.verifyApiKey(apiKey);

		expect(result.user?.id).toBe(owner.id);
		expect(result.context).toBeUndefined();
	});
});
