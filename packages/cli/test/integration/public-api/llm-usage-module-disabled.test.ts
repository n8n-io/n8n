import { ModuleRegistry } from '@n8n/backend-common';
import { Container } from '@n8n/di';

import { createOwnerWithApiKey } from '../shared/db/users';
import * as utils from '../shared/utils';

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

test('GET /llm-usage/calls returns 503 when the llm-usage module is not enabled', async () => {
	const owner = await createOwnerWithApiKey({ scopes: ['llmUsage:read'] });
	expect(Container.get(ModuleRegistry).isActive('llm-usage')).toBe(false);

	const response = await testServer.publicApiAgentFor(owner).get('/llm-usage/calls').expect(503);

	expect(response.body).toEqual({ message: 'LLM usage module is not enabled' });
});
