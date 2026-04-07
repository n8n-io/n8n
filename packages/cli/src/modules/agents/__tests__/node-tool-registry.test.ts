import { mock } from 'jest-mock-extended';
import type { CredentialProvider } from '@n8n/agents';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeToolRegistry } from '../node-tool-registry';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(overrides: Partial<INodeTypeDescription> = {}): INodeTypeDescription {
	return mock<INodeTypeDescription>({
		name: 'n8n-nodes-base.httpRequest',
		displayName: 'HTTP Request',
		description: 'Makes HTTP requests to any URL',
		version: 1,
		credentials: [],
		usableAsTool: true,
		...overrides,
	});
}

function makeRegistry(nodes: INodeTypeDescription[]): NodeToolRegistry {
	const lnc = mock<LoadNodesAndCredentials>();
	lnc.collectTypes.mockResolvedValue({ nodes, credentials: [] });
	return new NodeToolRegistry(lnc);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NodeToolRegistry', () => {
	describe('listTools()', () => {
		it('only returns nodes flagged as usableAsTool', async () => {
			const registry = makeRegistry([
				makeNode({ name: 'n8n-nodes-base.httpRequest', usableAsTool: true }),
				makeNode({ name: 'n8n-nodes-base.set', usableAsTool: undefined }),
				makeNode({ name: 'n8n-nodes-base.gmail', usableAsTool: true }),
			]);

			const tools = await registry.listTools();

			expect(tools.map((t) => t.nodeType)).toEqual([
				'n8n-nodes-base.httpRequest',
				'n8n-nodes-base.gmail',
			]);
		});

		it('projects all ToolDescriptor fields correctly', async () => {
			const registry = makeRegistry([
				makeNode({
					name: 'n8n-nodes-base.httpRequest',
					displayName: 'HTTP Request',
					description: 'Makes HTTP requests to any URL',
					version: 4,
				}),
			]);

			const [tool] = await registry.listTools();

			expect(tool).toMatchObject({
				nodeType: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
				description: 'Makes HTTP requests to any URL',
				nodeTypeVersion: 4,
			});
		});

		describe('nodeTypeVersion', () => {
			it('uses the version directly when it is a number', async () => {
				const registry = makeRegistry([makeNode({ version: 3 })]);
				const [tool] = await registry.listTools();
				expect(tool.nodeTypeVersion).toBe(3);
			});

			it('uses the last element when version is an array', async () => {
				const registry = makeRegistry([makeNode({ version: [1, 2, 3] })]);
				const [tool] = await registry.listTools();
				expect(tool.nodeTypeVersion).toBe(3);
			});
		});

		describe('without a credential provider', () => {
			it('sets hasCredentials to true for all nodes', async () => {
				const registry = makeRegistry([
					makeNode({ credentials: [] }),
					makeNode({ credentials: [mock({ name: 'gmailOAuth2' })] }),
				]);

				const tools = await registry.listTools();

				expect(tools.every((t) => t.hasCredentials)).toBe(true);
			});

			it('returns an empty credentials array', async () => {
				const registry = makeRegistry([makeNode()]);
				const [tool] = await registry.listTools();
				expect(tool.credentials).toEqual([]);
			});
		});

		describe('with a credential provider', () => {
			it('sets hasCredentials to true when the node requires no credentials', async () => {
				const registry = makeRegistry([makeNode({ credentials: [] })]);
				const provider = mock<CredentialProvider>();
				provider.list.mockResolvedValue([]);

				const [tool] = await registry.listTools(provider);

				expect(tool.hasCredentials).toBe(true);
			});

			it('sets hasCredentials to true when a matching credential is available', async () => {
				const registry = makeRegistry([makeNode({ credentials: [mock({ name: 'gmailOAuth2' })] })]);
				const provider = mock<CredentialProvider>();
				provider.list.mockResolvedValue([{ id: 'cred-1', name: 'My Gmail', type: 'gmailOAuth2' }]);

				const [tool] = await registry.listTools(provider);

				expect(tool.hasCredentials).toBe(true);
			});

			it('sets hasCredentials to false when no matching credential is available', async () => {
				const registry = makeRegistry([makeNode({ credentials: [mock({ name: 'gmailOAuth2' })] })]);
				const provider = mock<CredentialProvider>();
				provider.list.mockResolvedValue([{ id: 'cred-1', name: 'My Slack', type: 'slackApi' }]);

				const [tool] = await registry.listTools(provider);

				expect(tool.hasCredentials).toBe(false);
			});

			it('populates credentials with matching CredentialListItems', async () => {
				const registry = makeRegistry([makeNode({ credentials: [mock({ name: 'gmailOAuth2' })] })]);
				const provider = mock<CredentialProvider>();
				provider.list.mockResolvedValue([
					{ id: 'cred-1', name: 'My Gmail', type: 'gmailOAuth2' },
					{ id: 'cred-2', name: 'Other Cred', type: 'slackApi' },
				]);

				const [tool] = await registry.listTools(provider);

				expect(tool.credentials).toEqual([{ id: 'cred-1', name: 'My Gmail', type: 'gmailOAuth2' }]);
			});

			it('returns an empty credentials array when no credentials match', async () => {
				const registry = makeRegistry([makeNode({ credentials: [mock({ name: 'gmailOAuth2' })] })]);
				const provider = mock<CredentialProvider>();
				provider.list.mockResolvedValue([{ id: 'cred-1', name: 'My Slack', type: 'slackApi' }]);

				const [tool] = await registry.listTools(provider);

				expect(tool.credentials).toEqual([]);
			});
		});

		it('calls collectTypes only once across multiple listTools() calls', async () => {
			const lnc = mock<LoadNodesAndCredentials>();
			lnc.collectTypes.mockResolvedValue({ nodes: [makeNode()], credentials: [] });
			const registry = new NodeToolRegistry(lnc);

			await registry.listTools();
			await registry.listTools();
			await registry.listTools();

			expect(lnc.collectTypes).toHaveBeenCalledTimes(1);
		});
	});
});
