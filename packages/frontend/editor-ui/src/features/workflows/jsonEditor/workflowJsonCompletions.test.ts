import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
	CompletionContext,
	closeBrackets,
	completionStatus,
	insertCompletionText,
	type CompletionResult,
	type CompletionSource,
} from '@codemirror/autocomplete';
import { json } from '@codemirror/lang-json';
import { EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap, runScopeHandlers } from '@codemirror/view';
import type { INodeTypeDescription } from 'n8n-workflow';

import { editorKeymap } from '@/features/shared/editors/plugins/codemirror/keymap';

import {
	workflowJsonAutocomplete,
	workflowJsonCompletionSource,
	type WorkflowJsonCompletionDeps,
} from './workflowJsonCompletions';

const NODES_JSON = join(process.cwd(), '..', '..', 'nodes-base', 'dist', 'types', 'nodes.json');

function loadDescriptions(): INodeTypeDescription[] {
	if (!existsSync(NODES_JSON)) return [];
	const raw = JSON.parse(readFileSync(NODES_JSON, 'utf8')) as INodeTypeDescription[];
	return raw.map((description) => ({ ...description, name: `n8n-nodes-base.${description.name}` }));
}

const descriptions = loadDescriptions();
const versionsOf = ({ version }: INodeTypeDescription) =>
	Array.isArray(version) ? version : [version];
const latestOf = (type: string) =>
	descriptions
		.filter(({ name }) => name === type)
		.sort((a, b) => Math.max(...versionsOf(b)) - Math.max(...versionsOf(a)))
		.at(0) ?? null;

const CREDENTIALS: Record<string, Array<{ id: string; name: string }>> = {
	httpBasicAuth: [
		{ id: 'cred-1', name: 'Basic prod' },
		{ id: 'cred-2', name: 'Basic staging' },
	],
};

const deps: WorkflowJsonCompletionDeps = {
	getNodeType: (type, version) =>
		version === undefined
			? latestOf(type)
			: (descriptions.find(
					(description) => description.name === type && versionsOf(description).includes(version),
				) ?? null),
	getNodeVersions: (type) => descriptions.filter(({ name }) => name === type).flatMap(versionsOf),
	getNodeTypes: () =>
		[...new Set(descriptions.map(({ name }) => name))].flatMap((name) => latestOf(name) ?? []),
	getCredentialsByType: (type) => CREDENTIALS[type] ?? [],
};

const source: CompletionSource = workflowJsonCompletionSource(deps);

type Options = {
	parameters?: string;
	credentials?: string;
	type?: string;
	typeVersion?: string;
	connections?: string;
	settings?: string;
	extraNode?: string;
};

/** A workflow document. The `|` in one of the parts marks the cursor. */
function workflow({
	parameters = '{}',
	credentials = '{}',
	type = '"n8n-nodes-base.httpRequest"',
	typeVersion = '4.2',
	connections = '{}',
	settings = '{}',
	extraNode = '',
}: Options = {}): string {
	return `{
  "name": "Test",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [0, 0],
      "id": "node-1",
      "parameters": {}
    },
    {
      "name": "HTTP Request",
      "type": ${type},
      "typeVersion": ${typeVersion},
      "position": [200, 0],
      "id": "node-2",
      "parameters": ${parameters},
      "credentials": ${credentials}${extraNode}
    }
  ],
  "connections": ${connections},
  "pinData": {},
  "settings": ${settings}
}`;
}

function setup(docWithCursor: string, explicit = false) {
	const pos = docWithCursor.indexOf('|');
	const doc = docWithCursor.slice(0, pos) + docWithCursor.slice(pos + 1);
	const state = EditorState.create({
		doc,
		selection: { anchor: pos },
		extensions: [json(), workflowJsonAutocomplete(deps)],
	});
	const result = source(new CompletionContext(state, pos, explicit));
	if (result instanceof Promise) throw new Error('The source must be synchronous');
	return { state, pos, result };
}

function labels(docWithCursor: string, explicit = false): string[] {
	return setup(docWithCursor, explicit).result?.options.map(({ label }) => label) ?? [];
}

function accept(
	docWithCursor: string,
	label: string,
	{ explicit = false, detail }: { explicit?: boolean; detail?: string } = {},
) {
	const { state, pos, result } = setup(docWithCursor, explicit);
	const option = result?.options.find(
		(candidate) =>
			candidate.label === label && (detail === undefined || candidate.detail === detail),
	);
	if (!result || !option) throw new Error(`No completion "${label}"`);

	const view = new EditorView({ state });
	const to = result.to ?? pos;
	if (typeof option.apply === 'function') {
		option.apply(view, option, result.from, to);
	} else {
		view.dispatch(insertCompletionText(view.state, option.apply ?? option.label, result.from, to));
	}
	const { main } = view.state.selection;
	const outcome = {
		doc: view.state.doc.toString(),
		selected: view.state.sliceDoc(main.from, main.to),
		reopened: completionStatus(view.state) === 'pending',
	};
	view.destroy();
	return outcome;
}

type ParsedWorkflow = {
	nodes: Array<{
		type: string;
		typeVersion: number;
		parameters: Record<string, unknown>;
		credentials?: Record<string, unknown>;
	}>;
	connections: Record<string, Record<string, unknown>>;
	settings: Record<string, unknown>;
};

const parse = (doc: string) => JSON.parse(doc) as ParsedWorkflow;
const httpNode = (doc: string) => parse(doc).nodes[1];

const pause = async (ms: number) => await new Promise((resolve) => setTimeout(resolve, ms));

/** Types `keys` one by one in an editor set up like the panel, and returns the document. */
async function typeInEditor(docWithCursor: string, keys: string[]): Promise<string> {
	const pos = docWithCursor.indexOf('|');
	const view = new EditorView({
		state: EditorState.create({
			doc: docWithCursor.slice(0, pos) + docWithCursor.slice(pos + 1),
			selection: { anchor: pos },
			extensions: [
				json(),
				closeBrackets(),
				Prec.highest(keymap.of(editorKeymap)),
				workflowJsonAutocomplete(deps),
			],
		}),
		parent: document.body,
	});
	for (const key of keys) {
		if (key === 'Enter') {
			runScopeHandlers(view, new KeyboardEvent('keydown', { key }), 'editor');
		} else if (key === 'Ctrl-Space') {
			runScopeHandlers(view, new KeyboardEvent('keydown', { key: ' ', ctrlKey: true }), 'editor');
		} else {
			const { head } = view.state.selection.main;
			view.dispatch({
				changes: { from: head, insert: key },
				selection: { anchor: head + key.length },
				userEvent: 'input.type',
			});
		}
		// Longer than the typing delay of the list and the delay before Enter accepts an option
		await pause(150);
	}
	const doc = view.state.doc.toString();
	view.destroy();
	return doc;
}

const PANEL_PARAMETERS = {
	method: 'POST',
	url: 'https://example.com',
	sendHeaders: true,
	headerParameters: { parameters: [{ name: 'a', value: 'b' }] },
	sendBody: true,
	contentType: 'multipart-form-data',
	bodyParameters: { parameters: [{ name: 'c', value: 'd' }] },
	options: {},
};

/** The parameters formatted like in the panel, with a new key `"|"` on line `at`. */
function parametersWithNewKey(at: number): string {
	const lines = Object.entries(PANEL_PARAMETERS).map(
		([key, value], i, all) =>
			`        ${JSON.stringify(key)}: ${JSON.stringify(value)}${i < all.length - 1 ? ',' : ''}`,
	);
	lines.splice(at, 0, '        "|"');
	return `{\n${lines.join('\n')}\n      }`;
}

const isResult = (result: CompletionResult | null): result is CompletionResult => result !== null;

describe.skipIf(descriptions.length === 0)('workflowJsonCompletionSource', () => {
	it('registers the source as JSON language data', () => {
		const { state, pos } = setup(workflow({ parameters: '{ "|" }' }));
		expect(state.languageDataAt('autocomplete', pos)).toHaveLength(1);
	});

	describe('top level and nodes', () => {
		it('completes the missing top-level keys', () => {
			expect(labels('{ "name": "x", "nodes": [], "|" }')).toEqual([
				'connections',
				'pinData',
				'settings',
			]);
		});

		it('completes node keys that the node does not have', () => {
			const result = labels(workflow({ extraNode: ', "dis|"' }));
			expect(result).toContain('disabled');
			expect(result).toContain('onError');
			expect(result).not.toContain('type');
			expect(result).not.toContain('parameters');
		});

		it('does not offer the key of the member below a new node key', () => {
			const doc = workflow().replace(
				'"type": "n8n-nodes-base.httpRequest"',
				'"|"\n      "type": "n8n-nodes-base.httpRequest"',
			);
			expect(labels(doc)).toContain('disabled');
			expect(labels(doc)).not.toContain('type');
		});

		it('inserts a node key with its value selected and reopens the list', () => {
			const outcome = accept(workflow({ extraNode: ', "onE|"' }), 'onError');
			expect(httpNode(outcome.doc)).toMatchObject({ onError: 'continueRegularOutput' });
			expect(outcome.selected).toBe('continueRegularOutput');
			expect(outcome.reopened).toBe(true);
		});

		it('completes onError and boolean node fields', () => {
			expect(labels(workflow({ extraNode: ', "onError": "|"' }))).toEqual([
				'stopWorkflow',
				'continueRegularOutput',
				'continueErrorOutput',
			]);
			expect(labels(workflow({ extraNode: ', "disabled": t|' }))).toEqual(['true', 'false']);
		});

		it('completes installed node types by name and by display name', () => {
			const { result } = setup(workflow({ type: '"httpR|"' }));
			expect(result?.options.at(0)).toMatchObject({
				label: 'n8n-nodes-base.httpRequest',
				detail: 'HTTP Request',
			});
			expect(result?.filter).toBe(false);
			expect(labels(workflow({ type: '"edit fie|"' }))).toContain('n8n-nodes-base.set');
		});

		it('changes a typeVersion that the new type does not have', () => {
			const outcome = accept(workflow({ type: '"edit fie|"' }), 'n8n-nodes-base.set');
			const node = httpNode(outcome.doc);
			expect(node.type).toBe('n8n-nodes-base.set');
			expect(node.typeVersion).toBe(latestOf('n8n-nodes-base.set')?.defaultVersion);
		});

		it('lists every typeVersion of the node type, the current one first, then latest first', () => {
			const { result } = setup(workflow({ typeVersion: '4.2|' }));
			const others = deps
				.getNodeVersions('n8n-nodes-base.httpRequest')
				.filter((version) => version !== 4.2)
				.sort((a, b) => b - a);
			expect(result?.options.map(({ label }) => label)).toEqual(['4.2', ...others.map(String)]);
			expect(result?.options.find(({ label }) => label === '4.5')?.detail).toBe('Default');
			expect(labels(workflow({ typeVersion: '4|' }))).toContain('4.5');
		});
	});

	describe('parameters', () => {
		it('completes displayed parameters of httpRequest 4.2 and inserts the default', () => {
			const doc = workflow({ parameters: '{ "url": "https://example.com", "met|" }' });
			const result = labels(doc);
			expect(result).toContain('method');
			expect(result).toContain('authentication');
			expect(result).toContain('options');
			expect(result).not.toContain('url');
			expect(result).not.toContain('jsonBody');
			expect(result).not.toContain('curlImport');
			expect(result).not.toContain('infoMessage');

			const outcome = accept(doc, 'method');
			expect(httpNode(outcome.doc).parameters).toEqual({
				url: 'https://example.com',
				method: 'GET',
			});
			expect(outcome.selected).toBe('GET');
			expect(outcome.reopened).toBe(true);
		});

		it('shows the parameter display name, type and description', () => {
			const { result } = setup(workflow({ parameters: '{ "met|" }' }));
			expect(result?.options.find(({ label }) => label === 'method')).toMatchObject({
				detail: 'Method (options)',
				info: 'The request method to use',
			});
		});

		it('completes parameters that other values show', () => {
			const doc = workflow({ parameters: '{ "sendBody": true, "specifyBody": "json", "js|" }' });
			expect(labels(doc)).toContain('jsonBody');
			expect(labels(doc)).not.toContain('bodyParameters');
		});

		it('completes the values of an options parameter', () => {
			const doc = workflow({ parameters: '{ "method": "|" }' });
			expect(labels(doc)).toEqual(
				expect.arrayContaining(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
			);
			const outcome = accept(doc, 'POST');
			expect(httpNode(outcome.doc).parameters).toEqual({ method: 'POST' });
		});

		it('lists every value when the current value is complete, the current one first', () => {
			const { result } = setup(workflow({ parameters: '{ "method": "PUT|" }' }), true);
			expect(result?.filter).toBe(false);
			expect(result?.options.at(0)?.label).toBe('PUT');
			expect(result?.options.length).toBeGreaterThan(5);
		});

		it('completes keys of the options collection', () => {
			const doc = workflow({ parameters: '{ "options": { "ti|" } }' });
			expect(labels(doc)).toContain('timeout');
			expect(labels(doc)).not.toContain('queryParameterArrays');
			expect(
				labels(workflow({ parameters: '{ "sendQuery": true, "options": { "que|" } }' })),
			).toContain('queryParameterArrays');

			const outcome = accept(doc, 'timeout');
			expect(httpNode(outcome.doc).parameters).toEqual({ options: { timeout: 10000 } });
		});

		it('completes fixedCollection groups and the fields of a group item', () => {
			const groups = workflow({
				parameters: '{ "sendHeaders": true, "headerParameters": { "|" } }',
			});
			expect(labels(groups)).toEqual(['parameters']);
			expect(httpNode(accept(groups, 'parameters').doc).parameters).toEqual({
				sendHeaders: true,
				headerParameters: { parameters: [{}] },
			});

			const fields = workflow({
				parameters: '{ "sendHeaders": true, "headerParameters": { "parameters": [{ "|" }] } }',
			});
			expect(labels(fields)).toEqual(['name', 'value']);
		});

		it('completes nested fixedCollection values inside a collection', () => {
			const doc = workflow({
				parameters: '{ "options": { "pagination": { "pagination": { "paginationMode": "|" } } } }',
			});
			expect(labels(doc)).toEqual([
				'off',
				'updateAParameterInEachRequest',
				'responseContainsNextURL',
			]);

			const itemType = workflow({
				parameters:
					'{ "options": { "pagination": { "pagination": { "parameters": { "parameters": [{ "type": "|" }] } } } } }',
			});
			expect(labels(itemType)).toEqual(expect.arrayContaining(['body', 'headers', 'qs']));
		});

		it('uses the type version for display options', () => {
			const set34 = workflow({
				type: '"n8n-nodes-base.set"',
				typeVersion: '3.4',
				parameters: '{ "|" }',
			});
			expect(labels(set34)).toContain('assignments');
			expect(labels(set34)).not.toContain('fields');

			const if22 = workflow({
				type: '"n8n-nodes-base.if"',
				typeVersion: '2.2',
				parameters: '{ "|" }',
			});
			expect(labels(if22)).toEqual(expect.arrayContaining(['conditions', 'looseTypeValidation']));
		});

		it('inserts a whole member on Ctrl+Space and adds the missing comma', () => {
			const doc = workflow({ parameters: '{ "url": "https://example.com" | }' });
			expect(labels(doc)).toEqual([]);
			const outcome = accept(doc, 'method', { explicit: true });
			expect(httpNode(outcome.doc).parameters).toEqual({
				url: 'https://example.com',
				method: 'GET',
			});
		});

		it('adds the comma that a new key on the next line needs', () => {
			const doc = workflow({ parameters: '{\n  "url": "https://example.com"\n  "met|"\n}' });
			expect(httpNode(accept(doc, 'method').doc).parameters).toEqual({
				url: 'https://example.com',
				method: 'GET',
			});
		});

		it('replaces only the key when the key has a value', () => {
			const outcome = accept(workflow({ parameters: '{ "met|": "POST" }' }), 'method');
			expect(httpNode(outcome.doc).parameters).toEqual({ method: 'POST' });
		});

		it('completes a key that has no closing quote', () => {
			const outcome = accept(workflow({ parameters: '{\n  "met|\n}' }), 'method');
			expect(httpNode(outcome.doc).parameters).toEqual({ method: 'GET' });
		});

		it('completes a new key above other members with the keys that the object does not have', () => {
			const missing = ['authentication', 'provideSslCertificates', 'sendQuery', 'specifyHeaders'];
			const lists = Array.from({ length: Object.keys(PANEL_PARAMETERS).length + 1 }, (_, at) =>
				labels(workflow({ parameters: parametersWithNewKey(at) })),
			);
			expect(lists).toEqual(lists.map(() => missing));
		});

		it('inserts a new key above another member with a comma after it', () => {
			const outcome = accept(workflow({ parameters: parametersWithNewKey(0) }), 'authentication');
			expect(httpNode(outcome.doc).parameters).toEqual({
				authentication: 'none',
				...PANEL_PARAMETERS,
			});
		});

		it('offers the default of a parameter only while the value is empty', () => {
			const timeout = (value: string) =>
				workflow({ parameters: `{ "options": { "timeout": ${value} } }` });
			expect(labels(timeout('1|'))).toEqual([]);
			expect(labels(timeout('1|'), true)).toEqual([]);
			expect(labels(timeout('"|"'))).toEqual(['10000']);
			expect(setup(timeout('|'), true).result?.options).toEqual([
				expect.objectContaining({ label: '10000', detail: 'Default' }),
			]);
		});

		it('keeps a typed number when Enter is pressed', async () => {
			const timeout = workflow({ parameters: '{ "options": { "timeout": | } }' });
			const typed = await typeInEditor(timeout, ['1', '0', '0', '0', 'Enter']);
			expect(httpNode(typed).parameters).toEqual({ options: { timeout: 1000 } });

			const afterRequest = await typeInEditor(timeout, ['Ctrl-Space', '1', '0', '0', '0', 'Enter']);
			expect(httpNode(afterRequest).parameters).toEqual({ options: { timeout: 1000 } });

			const accepted = await typeInEditor(timeout, ['Ctrl-Space', 'Enter']);
			expect(httpNode(accepted).parameters).toEqual({ options: { timeout: 10000 } });

			const redirects = await typeInEditor(
				workflow({
					parameters:
						'{ "options": { "redirect": { "redirect": { "followRedirects": true, "maxRedirects": | } } } }',
				}),
				['2', 'Enter'],
			);
			expect(httpNode(redirects).parameters).toEqual({
				options: { redirect: { redirect: { followRedirects: true, maxRedirects: 2 } } },
			});
		});

		it('keeps the next key when a value without a closing quote is completed', () => {
			const outcome = accept(workflow({ parameters: '{ "method": "P|, "url": "x" }' }), 'POST');
			expect(httpNode(outcome.doc).parameters).toEqual({ method: 'POST', url: 'x' });
		});

		it('completes resource locator keys, modes and the default with __rl', () => {
			const airtable = (parameters: string) =>
				workflow({ type: '"n8n-nodes-base.airtableTrigger"', typeVersion: '1', parameters });

			expect(httpNode(accept(airtable('{ "bas|" }'), 'baseId').doc).parameters).toEqual({
				baseId: { __rl: true, mode: 'url', value: '' },
			});
			expect(labels(airtable('{ "baseId": { "__rl": true, "|" } }'))).toEqual([
				'mode',
				'value',
				'cachedResultName',
				'cachedResultUrl',
			]);
			expect(labels(airtable('{ "baseId": { "__rl": true, "mode": "|", "value": "" } }'))).toEqual([
				'url',
				'id',
			]);
		});

		it('completes a bare word in a value position', () => {
			const outcome = accept(workflow({ parameters: '{ "sendBody": t| }' }), 'true');
			expect(httpNode(outcome.doc).parameters).toEqual({ sendBody: true });
		});
	});

	describe('credentials', () => {
		const withAuth =
			'{ "authentication": "genericCredentialType", "genericAuthType": "httpBasicAuth" }';

		it('completes the credential types that the node uses, one entry for each credential', () => {
			const { result } = setup(workflow({ parameters: withAuth, credentials: '{ "|" }' }));
			expect(result?.options.map(({ label, detail }) => [label, detail])).toEqual([
				['httpBasicAuth', 'Basic prod'],
				['httpBasicAuth', 'Basic staging'],
			]);
			const outcome = accept(
				workflow({ parameters: withAuth, credentials: '{ "|" }' }),
				'httpBasicAuth',
				{
					detail: 'Basic staging',
				},
			);
			expect(httpNode(outcome.doc).credentials).toEqual({
				httpBasicAuth: { id: 'cred-2', name: 'Basic staging' },
			});
		});

		it('completes a credential object and credential ids', () => {
			expect(
				labels(workflow({ parameters: withAuth, credentials: '{ "httpBasicAuth": | }' }), true),
			).toEqual(['Basic prod', 'Basic staging']);

			const ids = workflow({
				parameters: withAuth,
				credentials: '{ "httpBasicAuth": { "id": "|", "name": "" } }',
			});
			expect(labels(ids)).toEqual(['cred-1', 'cred-2']);
		});
	});

	describe('connections, pinned data and settings', () => {
		it('completes the node names of connection targets', () => {
			const doc = workflow({
				connections: '{ "Webhook": { "main": [[{ "node": "|", "type": "main", "index": 0 }]] } }',
			});
			expect(labels(doc)).toEqual(['Webhook', 'HTTP Request']);
		});

		it('completes source node names, connection types and new connections', () => {
			expect(labels(workflow({ connections: '{ "|" }' }))).toEqual(['Webhook', 'HTTP Request']);
			expect(labels(workflow({ connections: '{ "Webhook": { "ai_t|" } }' }))).toContain('ai_tool');

			const outcome = accept(
				workflow({ connections: '{ "Webhook": { "main": [[|]] } }' }),
				'HTTP Request',
				{ explicit: true },
			);
			expect(parse(outcome.doc).connections).toEqual({
				Webhook: { main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]] },
			});
		});

		it('completes pinned data keys with node names', () => {
			const doc = workflow().replace('"pinData": {}', '"pinData": { "Web|" }');
			expect(labels(doc)).toEqual(['Webhook', 'HTTP Request']);
		});

		it('completes settings keys and values', () => {
			expect(labels(workflow({ settings: '{ "exec|" }' }))).toEqual(
				expect.arrayContaining(['executionOrder', 'executionTimeout']),
			);
			expect(labels(workflow({ settings: '{ "executionOrder": "|" }' }))).toEqual(['v0', 'v1']);
			expect(labels(workflow({ settings: '{ "callerPolicy": "|" }' }))).toEqual([
				'any',
				'none',
				'workflowsFromAList',
				'workflowsFromSameOwner',
			]);
		});
	});

	it('returns no result for an empty position unless completion is requested', () => {
		const doc = workflow({ parameters: '{ "url": "x", | }' });
		expect(setup(doc).result).toBeNull();
		expect(isResult(setup(doc, true).result)).toBe(true);
	});

	const fullDoc = workflow({
		parameters:
			'{ "method": "POST", "sendHeaders": true, "headerParameters": { "parameters": [{ "name": "a" }] }, "options": { "timeout": 5 } }',
		credentials: '{ "httpBasicAuth": { "id": "cred-1", "name": "Basic prod" } }',
		connections:
			'{ "Webhook": { "main": [[{ "node": "HTTP Request", "type": "main", "index": 0 }]] } }',
		settings: '{ "executionOrder": "v1" }',
	});

	it('keeps a valid document valid when any completion is applied anywhere', () => {
		const applied = Array.from({ length: fullDoc.length + 1 }, (_, pos) => pos).flatMap((pos) => {
			const docWithCursor = `${fullDoc.slice(0, pos)}|${fullDoc.slice(pos)}`;
			const options = setup(docWithCursor, true).result?.options ?? [];
			return [options.at(0), options.at(-1)]
				.filter((option) => option !== undefined)
				.map((option) => {
					const { doc } = accept(docWithCursor, option.label, {
						explicit: true,
						detail: option.detail,
					});
					try {
						JSON.parse(doc);
						return { pos, label: option.label, valid: true };
					} catch {
						return { pos, label: option.label, valid: false };
					}
				});
		});
		expect(applied.length).toBeGreaterThan(200);
		expect(applied.filter(({ valid }) => !valid)).toEqual([]);
	});

	it('does not throw at any position, also when a character is missing', () => {
		const doc = fullDoc;
		const complete = (text: string, pos: number, explicit: boolean) =>
			source(
				new CompletionContext(
					EditorState.create({ doc: text, extensions: [json()] }),
					pos,
					explicit,
				),
			);

		const positions = Array.from({ length: doc.length + 1 }, (_, pos) => pos);
		expect(() =>
			positions.forEach((pos) => {
				complete(doc, pos, true);
				complete(doc, pos, false);
				if (pos < doc.length) complete(doc.slice(0, pos) + doc.slice(pos + 1), pos, true);
			}),
		).not.toThrow();
	});
});
