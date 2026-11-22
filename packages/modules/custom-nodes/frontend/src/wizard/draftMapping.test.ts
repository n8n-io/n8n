import { createDraft } from '../custom-nodes.test.utils';
import {
	buildDraft,
	createEntry,
	createInput,
	draftToSource,
	emptyRequest,
	syncUrlInputs,
	toDisplayName,
	toIdentifier,
	urlPlaceholders,
} from './draftMapping';

describe('draftMapping', () => {
	it.each([
		['line_items[0].price', 'lineItems0Price'],
		['X-Api-Version', 'xApiVersion'],
		['2fa', 'field2fa'],
		['', 'value'],
	])('turns %s into the identifier %s', (key, identifier) => {
		expect(toIdentifier(key)).toBe(identifier);
	});

	it('builds a display name from the last part of a key', () => {
		expect(toDisplayName('customer.unit_price')).toBe('Unit Price');
		expect(toDisplayName('invoiceId')).toBe('Invoice Id');
	});

	it('reads placeholders from the URL path only', () => {
		expect(urlPlaceholders('/users/{userId}/items/{id}?q={nope}')).toEqual(['userId', 'id']);
	});

	it('adds a URL input for a new placeholder and removes one without a placeholder', () => {
		const body = createInput({ name: 'title', key: 'title', target: 'body' });
		const stale = createInput({ name: 'old', key: 'old', target: 'url', required: true });

		const synced = syncUrlInputs('/users/{userId}', [body, stale]);

		expect(synced).toEqual([
			body,
			expect.objectContaining({ name: 'userId', key: 'userId', target: 'url', required: true }),
		]);
	});

	it('builds a draft and keeps each input at its index', () => {
		const { draft, issues } = buildDraft({
			name: ' Get item ',
			description: '',
			request: {
				...emptyRequest(),
				method: 'POST',
				url: '/items/{id}',
				headers: [createEntry('Accept', 'application/json'), createEntry('', '')],
				bodyType: 'json',
				bodyText: '{"status": "open"}',
			},
			inputs: [
				createInput({ name: 'id', displayName: 'ID', key: 'id', target: 'url', required: true }),
				createInput({
					name: 'limit',
					displayName: 'Limit',
					key: 'limit',
					target: 'query',
					type: 'number',
					defaultText: '10',
				}),
				createInput({
					name: 'mode',
					displayName: 'Mode',
					key: 'mode',
					type: 'options',
					optionsText: 'Fast=fast\nslow',
				}),
			],
		});

		expect(issues).toEqual([]);
		expect(draft).toEqual({
			name: 'Get item',
			description: undefined,
			request: {
				method: 'POST',
				url: '/items/{id}',
				headers: { Accept: 'application/json' },
				query: {},
				bodyType: 'json',
				body: { status: 'open' },
			},
			inputs: [
				expect.objectContaining({
					name: 'id',
					target: 'url',
					key: 'id',
					required: true,
					default: undefined,
				}),
				expect.objectContaining({ name: 'limit', type: 'number', default: 10 }),
				expect.objectContaining({
					name: 'mode',
					options: [
						{ name: 'Fast', value: 'fast' },
						{ name: 'slow', value: 'slow' },
					],
				}),
			],
		});
	});

	it('reports local issues with the paths of the server', () => {
		const { issues } = buildDraft({
			name: '',
			description: '',
			request: {
				...emptyRequest(),
				url: '',
				query: [createEntry('', 'orphan')],
				bodyType: 'json',
				bodyText: '[1, 2]',
			},
			inputs: [
				createInput({ name: 'ok', displayName: 'Ok', key: 'ok' }),
				createInput({
					name: 'Bad name',
					displayName: '',
					key: '',
					type: 'number',
					defaultText: 'x',
				}),
			],
		});

		expect(issues).toEqual(
			expect.arrayContaining([
				{ path: 'name', code: 'required' },
				{ path: 'request.url', code: 'required' },
				{ path: 'request.query', code: 'missing_key' },
				{ path: 'request.body', code: 'invalid_json' },
				{ path: 'inputs[1].name', code: 'invalid_input_name' },
				{ path: 'inputs[1].displayName', code: 'required' },
				{ path: 'inputs[1].key', code: 'required' },
				{ path: 'inputs[1].default', code: 'invalid_number' },
			]),
		);
		expect(issues.some((issue) => issue.path.startsWith('inputs[0]'))).toBe(false);
	});

	it('sends no body when the body type is none', () => {
		const { draft, issues } = buildDraft({
			name: 'A',
			description: '',
			request: { ...emptyRequest(), url: '/a', bodyType: 'none', bodyText: 'not json' },
			inputs: [],
		});

		expect(issues).toEqual([]);
		expect(draft.request.body).toEqual({});
	});

	it('turns a stored draft into the wizard form and back', () => {
		const stored = createDraft({
			description: 'Gets one',
			request: {
				method: 'GET',
				url: '/items/{id}',
				headers: { Accept: 'application/json' },
				query: { expand: 'all' },
				bodyType: 'none',
				body: {},
			},
			inputs: [
				{ name: 'id', displayName: 'ID', type: 'string', required: true, target: 'url', key: 'id' },
				{
					name: 'flag',
					displayName: 'Flag',
					type: 'boolean',
					required: false,
					default: true,
					target: 'query',
					key: 'flag',
				},
			],
		});

		const { draft } = buildDraft(draftToSource(stored));

		expect(draft).toEqual(stored);
	});
});
