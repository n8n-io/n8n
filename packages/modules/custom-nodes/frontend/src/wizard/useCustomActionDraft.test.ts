import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@n8n/frontend-test-utils';

import { useCustomNodesStore } from '../custom-nodes.store';
import {
	createAction,
	createDraft,
	createNode,
	createParentAction,
} from '../custom-nodes.test.utils';
import { createInput } from './draftMapping';
import { useCustomActionDraft } from './useCustomActionDraft';

const setup = () => {
	createTestingPinia();
	const store = mockedStore(useCustomNodesStore);
	store.nodes = [createNode()];
	store.parentActions = [createParentAction()];
	store.preview.mockResolvedValue({ issues: [], properties: [] });
	const wizard = useCustomActionDraft();
	return { store, wizard };
};

/** A complete new custom node with one action. */
const fillNewNode = (wizard: ReturnType<typeof useCustomActionDraft>) => {
	wizard.target.value = { kind: 'newNode' };
	wizard.node.value = {
		displayName: 'Acme',
		description: '',
		baseUrl: 'https://api.acme.test/v1',
		auth: { kind: 'none' },
	};
	wizard.name.value = 'Get item';
	wizard.updateRequest({ ...wizard.request.value, url: '/items/{id}' });
};

describe('useCustomActionDraft', () => {
	it('maps HTTP Request parameters and returns the names it did not copy', () => {
		const { wizard } = setup();

		const dropped = wizard.fromHttpRequestParameters({
			method: 'GET',
			url: '=https://api.acme.test/items/{{ $json.id }}',
			authentication: 'predefinedCredentialType',
			nodeCredentialType: 'acmeApi',
			sendHeaders: true,
			headerParameters: { parameters: [{ name: 'Authorization', value: 'Bearer x' }] },
		});

		expect(dropped).toEqual(['Authorization']);
		expect(wizard.droppedSecrets.value).toEqual(['Authorization']);
		expect(wizard.request.value.url).toBe('https://api.acme.test/items/{id}');
		expect(wizard.inputs.value).toEqual([expect.objectContaining({ name: 'id', target: 'url' })]);
		expect(wizard.node.value.auth).toEqual({ kind: 'predefined', credentialType: 'acmeApi' });
	});

	it('adds and removes inputs', () => {
		const { wizard } = setup();

		wizard.addInput('query');
		wizard.addInput();
		expect(wizard.inputs.value.map((input) => input.target)).toEqual(['query', 'body']);

		wizard.removeInput(wizard.inputs.value[0].id);
		expect(wizard.inputs.value.map((input) => input.target)).toEqual(['body']);
	});

	it('turns URL placeholders into URL inputs', () => {
		const { wizard } = setup();
		wizard.addInput('body');

		wizard.updateRequest({ ...wizard.request.value, url: '/users/{userId}/items/{itemId}' });
		expect(
			wizard.inputs.value.filter((input) => input.target === 'url').map((i) => i.name),
		).toEqual(['userId', 'itemId']);

		wizard.updateRequest({ ...wizard.request.value, url: '/users/{userId}' });
		expect(wizard.inputs.value.map((input) => input.name)).toEqual(['', 'userId']);
	});

	it('maps the issues of the preview to their fields and steps', async () => {
		const { store, wizard } = setup();
		fillNewNode(wizard);
		wizard.updateInputs([
			...wizard.inputs.value,
			createInput({ name: 'resource', displayName: 'Resource', key: 'resource', target: 'query' }),
		]);
		store.preview.mockResolvedValue({
			issues: [
				{
					path: 'inputs[1].name',
					code: 'reserved_input_name',
					message: 'The input name "resource" is reserved.',
				},
				{ path: 'request.url', code: 'invalid_url', message: 'The URL has an unmatched brace.' },
			],
			properties: [],
		});

		await wizard.runPreview();

		expect(store.preview).toHaveBeenCalledWith(wizard.draft.value);
		expect(wizard.issuesAt('inputs[1].name')).toEqual([
			expect.objectContaining({ message: 'The input name "resource" is reserved.' }),
		]);
		expect(wizard.issuesOfStep('fields')).toHaveLength(1);
		expect(wizard.issuesOfStep('request')).toHaveLength(1);
		expect(wizard.canSave.value).toBe(false);
	});

	it('does not ask the server while local issues exist', async () => {
		const { store, wizard } = setup();
		wizard.target.value = null;

		await wizard.runPreview();

		expect(store.preview).not.toHaveBeenCalled();
		expect(wizard.issuesAt('target')).toEqual([
			expect.objectContaining({ message: 'Select a node.' }),
		]);
	});

	it('needs an absolute URL for a parent node', () => {
		const { wizard } = setup();
		wizard.target.value = { kind: 'parent', parentNodeType: 'n8n-nodes-base.slack' };
		wizard.updateRequest({ ...wizard.request.value, url: '/chat.archive' });

		expect(wizard.issuesAt('request.url')).toEqual([
			expect.objectContaining({ code: 'absolute_url_required' }),
		]);
		expect(wizard.usesCredentialDomains.value).toBe(true);
	});

	it('shows the host of the base URL and the path of a custom node', () => {
		const { wizard } = setup();
		fillNewNode(wizard);

		expect(wizard.requestHost.value).toBe('api.acme.test');

		wizard.target.value = { kind: 'parent', parentNodeType: 'n8n-nodes-base.slack' };
		wizard.updateRequest({ ...wizard.request.value, url: 'https://slack.test/api/chat.archive' });
		expect(wizard.requestHost.value).toBe('slack.test');
	});

	it('shows no host while the URL is not complete', () => {
		const { wizard } = setup();
		wizard.target.value = { kind: 'parent', parentNodeType: 'n8n-nodes-base.slack' };
		wizard.updateRequest({ ...wizard.request.value, url: 'https://{region}.slack.test/x' });

		expect(wizard.requestHost.value).toBeUndefined();
	});

	describe('save', () => {
		it('creates a custom node with the action', async () => {
			const { store, wizard } = setup();
			fillNewNode(wizard);

			expect(await wizard.save()).toEqual({});
			expect(store.createNode).toHaveBeenCalledWith({
				displayName: 'Acme',
				description: undefined,
				baseUrl: 'https://api.acme.test/v1',
				auth: { kind: 'none' },
				actions: [wizard.draft.value],
			});
		});

		it('adds the action to a custom node', async () => {
			const { store, wizard } = setup();
			fillNewNode(wizard);
			wizard.target.value = { kind: 'node', customNodeId: 'node-1' };

			await wizard.save();

			expect(store.addActionToNode).toHaveBeenCalledWith('node-1', {
				draft: wizard.draft.value,
				changeNote: undefined,
			});
		});

		it('adds the action to a parent node', async () => {
			const { store, wizard } = setup();
			fillNewNode(wizard);
			wizard.target.value = { kind: 'parent', parentNodeType: 'n8n-nodes-base.slack' };

			await wizard.save();

			expect(store.addParentAction).toHaveBeenCalledWith({
				parentNodeType: 'n8n-nodes-base.slack',
				draft: wizard.draft.value,
				changeNote: undefined,
			});
		});

		it('saves an existing action and returns the kind of the edit', async () => {
			const { store, wizard } = setup();
			store.saveAction.mockResolvedValue({ action: createAction(), kind: 'version' });
			expect(wizard.loadAction('action-1')).toBe(true);
			wizard.changeNote.value = 'Adds a field';

			expect(await wizard.save()).toEqual({ kind: 'version' });
			expect(store.saveAction).toHaveBeenCalledWith('action-1', {
				draft: createDraft(),
				changeNote: 'Adds a field',
			});
		});
	});

	describe('loadAction', () => {
		it('loads an action of a custom node with its node as the target', () => {
			const { wizard } = setup();

			expect(wizard.loadAction('action-1')).toBe(true);
			expect(wizard.target.value).toEqual({ kind: 'node', customNodeId: 'node-1' });
			expect(wizard.name.value).toBe('Send message');
			expect(wizard.baseUrl.value).toBe('https://api.acme.test');
		});

		it('loads an action of a parent node', () => {
			const { wizard } = setup();

			expect(wizard.loadAction('parent-action-1')).toBe(true);
			expect(wizard.target.value).toEqual({
				kind: 'parent',
				parentNodeType: 'n8n-nodes-base.slack',
			});
		});

		it('returns false for an unknown action', () => {
			const { wizard } = setup();

			expect(wizard.loadAction('missing')).toBe(false);
		});
	});
});
