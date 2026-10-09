import fc from 'fast-check';

import { pushResult } from '../../__tests__/linkedInstances.fixtures';
import {
	remoteCopyState,
	remoteCredentialUrl,
	safeHttpUrl,
	transferResultView,
} from '../transferResult';

const BASE_URL = 'https://acme.app.n8n.cloud';

describe('safeHttpUrl', () => {
	it.each([
		['https://acme.app.n8n.cloud/workflow/1', 'https://acme.app.n8n.cloud/workflow/1'],
		['http://localhost:5680/workflow/1', 'http://localhost:5680/workflow/1'],
		['HTTPS://Acme.Example.Test', 'https://acme.example.test/'],
	])('keeps the http(s) URL %s', (value, expected) => {
		expect(safeHttpUrl(value)).toBe(expected);
	});

	it.each([
		['another scheme', 'ftp://acme.example.test/workflow/1'],
		['a data URL', 'data:text/html,hello'],
		['a relative path', '/workflow/1'],
		['an empty text', ''],
		['text that is no URL', 'not a url'],
	])('refuses %s', (_label, value) => {
		expect(safeHttpUrl(value)).toBeUndefined();
	});
});

describe('remoteCredentialUrl', () => {
	it('opens the credential in the editor of the linked instance', () => {
		expect(remoteCredentialUrl(BASE_URL, 'cred-1')).toBe(
			'https://acme.app.n8n.cloud/home/credentials/cred-1',
		);
	});

	it('keeps a path prefix and drops trailing slashes of the address', () => {
		expect(remoteCredentialUrl('https://acme.example.test/n8n//', 'cred-1')).toBe(
			'https://acme.example.test/n8n/home/credentials/cred-1',
		);
	});

	it('encodes the credential id', () => {
		expect(remoteCredentialUrl(BASE_URL, 'a/b?c')).toBe(
			'https://acme.app.n8n.cloud/home/credentials/a%2Fb%3Fc',
		);
	});

	it('gives no URL for an address that is not http(s)', () => {
		expect(remoteCredentialUrl('ftp://acme.example.test', 'cred-1')).toBeUndefined();
	});
});

describe('remoteCopyState', () => {
	it.each([
		[{ published: true, publishFailed: false }, 'live'],
		[{ published: true, publishFailed: true }, 'earlierLive'],
		[{ published: false, publishFailed: true }, 'notLive'],
		[{ published: false, publishFailed: false }, 'notLive'],
	] as const)('reads %o of a move that asked to publish as %s', (fields, expected) => {
		expect(remoteCopyState(fields, true)).toBe(expected);
	});

	it.each([
		[{ published: true, publishFailed: false }, 'keptLive'],
		[{ published: false, publishFailed: false }, 'notLive'],
	] as const)('reads %o of a move that did not ask to publish as %s', (fields, expected) => {
		expect(remoteCopyState(fields, false)).toBe(expected);
	});

	it('does not say that the moved version is live when only an earlier version is', () => {
		// A second move of a copy that is live there, from a workflow that is off here.
		const result = pushResult({
			created: false,
			published: true,
			publishFailed: false,
			warnings: [
				'The new version is not live, because the source workflow does not publish this version. An earlier version stays live.',
			],
		});

		expect(remoteCopyState(result, false)).toBe('keptLive');
	});
});

describe('transferResultView', () => {
	it('is a success when the copy needs nothing', () => {
		const view = transferResultView(pushResult({ published: true }), BASE_URL, true);

		expect(view).toEqual({
			tone: 'success',
			remoteState: 'live',
			turnedOffHere: false,
			openUrl: 'https://acme.app.n8n.cloud/workflow/remote-wf-1',
			needsSetUp: [],
			missingNodeTypes: [],
			warnings: [],
		});
	});

	it.each([
		['the publish failed', { publishFailed: true }],
		['a credential needs set-up', { credentialsNeedingSetup: [{ id: 'c', name: 'G', type: 'g' }] }],
		['a node type is missing', { missingNodeTypes: ['acme.thing@1'] }],
		['the server sent a warning', { warnings: ['The workflow went to your personal project.'] }],
	])('is a warning when %s', (_label, overrides) => {
		expect(transferResultView(pushResult(overrides), BASE_URL, true).tone).toBe('warning');
	});

	it('links each credential that needs set-up to the linked instance', () => {
		const view = transferResultView(
			pushResult({
				credentialsNeedingSetup: [
					{ id: 'cred-1', name: 'Gmail account', type: 'gmailOAuth2' },
					{ id: 'cred-2', name: 'Notion', type: 'notionApi' },
				],
			}),
			BASE_URL,
			false,
		);

		expect(view.needsSetUp.map(({ name, url }) => ({ name, url }))).toEqual([
			{ name: 'Gmail account', url: 'https://acme.app.n8n.cloud/home/credentials/cred-1' },
			{ name: 'Notion', url: 'https://acme.app.n8n.cloud/home/credentials/cred-2' },
		]);
	});

	it('gives no link for a copy URL that is not http(s)', () => {
		const view = transferResultView(
			pushResult({ remoteUrl: 'ftp://acme.example.test/workflow/1' }),
			BASE_URL,
			false,
		);

		expect(view.openUrl).toBeUndefined();
	});

	it('tells when the workflow here was turned off', () => {
		expect(
			transferResultView(pushResult({ localDeactivated: true }), BASE_URL, false).turnedOffHere,
		).toBe(true);
	});
});

describe('transferResultView (property)', () => {
	const credentialArb = fc.record({ id: fc.string(), name: fc.string(), type: fc.string() });
	const resultArb = fc.record({
		remoteWorkflowId: fc.string(),
		remoteUrl: fc.oneof(fc.webUrl(), fc.string()),
		targetProject: fc.constant(null),
		created: fc.boolean(),
		published: fc.boolean(),
		publishFailed: fc.boolean(),
		credentialsNeedingSetup: fc.array(credentialArb, { maxLength: 4 }),
		missingNodeTypes: fc.array(fc.string(), { maxLength: 4 }),
		localDeactivated: fc.boolean(),
		warnings: fc.array(fc.string(), { maxLength: 4 }),
	});
	const baseUrlArb = fc.oneof(fc.webUrl(), fc.string());

	it('links only to http(s) addresses', () => {
		fc.assert(
			fc.property(resultArb, baseUrlArb, fc.boolean(), (result, baseUrl, publishAsked) => {
				const view = transferResultView(result, baseUrl, publishAsked);
				const urls = [view.openUrl, ...view.needsSetUp.map(({ url }) => url)];

				for (const url of urls) {
					if (url !== undefined) expect(new URL(url).protocol).toMatch(/^https?:$/);
				}
			}),
		);
	});

	it('is a success exactly when nothing needs the user', () => {
		fc.assert(
			fc.property(resultArb, fc.boolean(), (result, publishAsked) => {
				const quiet =
					!result.publishFailed &&
					result.credentialsNeedingSetup.length === 0 &&
					result.missingNodeTypes.length === 0 &&
					result.warnings.length === 0;

				expect(transferResultView(result, BASE_URL, publishAsked).tone).toBe(
					quiet ? 'success' : 'warning',
				);
			}),
		);
	});

	it('says that the moved version is live only when the move asked to publish and it worked', () => {
		fc.assert(
			fc.property(resultArb, fc.boolean(), (result, publishAsked) => {
				const state = transferResultView(result, BASE_URL, publishAsked).remoteState;

				expect(state === 'notLive').toBe(!result.published);
				expect(state === 'live').toBe(result.published && publishAsked && !result.publishFailed);
				expect(state === 'earlierLive').toBe(
					result.published && publishAsked && result.publishFailed,
				);
				expect(state === 'keptLive').toBe(result.published && !publishAsked);
			}),
		);
	});

	it('keeps every credential, node type and warning as given', () => {
		fc.assert(
			fc.property(resultArb, fc.boolean(), (result, publishAsked) => {
				const view = transferResultView(result, BASE_URL, publishAsked);

				expect(view.needsSetUp.map(({ id, name, type }) => ({ id, name, type }))).toEqual(
					result.credentialsNeedingSetup,
				);
				expect(view.missingNodeTypes).toEqual(result.missingNodeTypes);
				expect(view.warnings).toEqual(result.warnings);
			}),
		);
	});
});
