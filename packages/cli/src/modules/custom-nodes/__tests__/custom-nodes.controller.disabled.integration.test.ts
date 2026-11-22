import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { listenOnLoopback } from './loopback-server';

// The module is not in `modules`, so its `init()` never runs and never imports the controller.
// One endpoint group is needed, so that the test server registers controllers at all.
const testServer = setupTestServer({ endpointGroups: ['me'], reuseServer: true });

beforeAll(async () => {
	await listenOnLoopback(testServer.httpServer);
});

const routes: Array<['get' | 'post' | 'patch' | 'put' | 'delete', string]> = [
	['get', '/custom-nodes'],
	['post', '/custom-nodes/preview'],
	['post', '/custom-nodes/nodes'],
	['get', '/custom-nodes/nodes/cn_acme'],
	['get', '/custom-nodes/actions/act_x/versions/1'],
	['patch', '/custom-nodes/nodes/cn_acme'],
	['delete', '/custom-nodes/nodes/cn_acme'],
	['put', '/custom-nodes/nodes/cn_acme/icon'],
	['get', '/custom-nodes/nodes/cn_acme/icon'],
	['post', '/custom-nodes/nodes/cn_acme/actions'],
	['patch', '/custom-nodes/actions/act_x'],
	['post', '/custom-nodes/actions/act_x/versions/1/rollback'],
	['delete', '/custom-nodes/actions/act_x'],
	['post', '/custom-nodes/actions'],
	['get', '/custom-nodes/actions'],
	['get', '/custom-nodes/parents'],
];

describe('CustomNodesController with the module not enabled', () => {
	it('returns 404 for every route when the module is not enabled', async () => {
		const agent = testServer.authAgentFor(await createOwner());

		for (const [method, path] of routes) {
			const res = await agent[method](path).send({});
			expect({ method, path, status: res.status }).toEqual({ method, path, status: 404 });
		}

		const basePaths = [...Container.get(ControllerRegistryMetadata).controllerClasses].map(
			(controller) =>
				Container.get(ControllerRegistryMetadata).getControllerMetadata(controller).basePath,
		);
		expect(basePaths).not.toContain('/custom-nodes');
	});
});
