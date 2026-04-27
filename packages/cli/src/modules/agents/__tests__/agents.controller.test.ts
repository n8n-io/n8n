import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Scope } from '@n8n/permissions';

import { AgentsController } from '../agents.controller';

type ExpectedScope = { scope: Scope; globalOnly: boolean } | 'no-scope';

const expectedScopes: Record<keyof AgentsController, ExpectedScope> = {
	create: { scope: 'agent:create', globalOnly: false },
	list: { scope: 'agent:list', globalOnly: false },
	getConfig: { scope: 'agent:read', globalOnly: false },
	putConfig: { scope: 'agent:update', globalOnly: false },
	deleteTool: { scope: 'agent:update', globalOnly: false },
	listCredentials: { scope: 'agent:read', globalOnly: false },
	getModelCatalog: { scope: 'agent:list', globalOnly: false },
	listThreads: { scope: 'agent:read', globalOnly: false },
	getThread: { scope: 'agent:read', globalOnly: false },
	deleteThread: { scope: 'agent:update', globalOnly: false },
	get: { scope: 'agent:read', globalOnly: false },
	update: { scope: 'agent:update', globalOnly: false },
	delete: { scope: 'agent:delete', globalOnly: false },
	publish: { scope: 'agent:update', globalOnly: false },
	unpublish: { scope: 'agent:update', globalOnly: false },
	chat: { scope: 'agent:execute', globalOnly: false },
	getChatMessages: { scope: 'agent:read', globalOnly: false },
	getBuilderMessages: { scope: 'agent:update', globalOnly: false },
	clearBuilderMessages: { scope: 'agent:update', globalOnly: false },
	getTestChatMessages: { scope: 'agent:read', globalOnly: false },
	clearTestChatMessages: { scope: 'agent:update', globalOnly: false },
	build: { scope: 'agent:update', globalOnly: false },
	buildResume: { scope: 'agent:update', globalOnly: false },
	connectIntegration: { scope: 'agent:update', globalOnly: false },
	disconnectIntegration: { scope: 'agent:update', globalOnly: false },
	integrationStatus: { scope: 'agent:read', globalOnly: false },
	// Webhook endpoint is public (skipAuth) — auth is enforced inside the
	// per-platform handler via signature verification, so no scope is set.
	handleWebhook: 'no-scope',
};

describe('AgentsController route access scopes', () => {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		AgentsController as never,
	);

	it.each(Object.entries(expectedScopes))(
		'%s has the correct access scope',
		(handlerName, expected) => {
			const route = metadata.routes.get(handlerName);
			expect(route).toBeDefined();

			if (expected === 'no-scope') {
				expect(route?.accessScope).toBeUndefined();
				expect(route?.skipAuth).toBe(true);
			} else {
				expect(route?.accessScope).toEqual(expected);
			}
		},
	);

	it('every route in AgentsController is covered by this test', () => {
		const declaredHandlers = Array.from(metadata.routes.keys()).sort();
		const expectedHandlers = Object.keys(expectedScopes).sort();
		expect(declaredHandlers).toEqual(expectedHandlers);
	});

	it('every protected route requires a project-scoped check (not global-only)', () => {
		for (const [handlerName, expected] of Object.entries(expectedScopes)) {
			if (expected === 'no-scope') continue;
			const route = metadata.routes.get(handlerName);
			expect(route?.accessScope?.globalOnly).toBe(false);
		}
	});
});
