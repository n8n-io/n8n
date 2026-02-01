import type { IDataObject } from 'n8n-workflow';

import { formatBuiltInTools, prepareAdditionalResponsesParams } from '../common';

describe('formatBuiltInTools', () => {
	it('returns empty array when no built-in tools provided', () => {
		expect(formatBuiltInTools(undefined as unknown as IDataObject)).toEqual([]);
		expect(formatBuiltInTools({} as unknown as IDataObject)).toEqual([]);
	});

	it('formats web_search with allowed domains and user location', () => {
		const tools = formatBuiltInTools({
			webSearch: {
				searchContextSize: 'high',
				allowedDomains: 'example.com, sub.domain.org , , another.net',
				country: 'US',
				city: 'NYC',
				region: 'NY',
			},
		} as unknown as IDataObject);

		expect(tools).toEqual([
			{
				type: 'web_search',
				search_context_size: 'high',
				user_location: {
					type: 'approximate',
					country: 'US',
					city: 'NYC',
					region: 'NY',
				},
				filters: { allowed_domains: ['example.com', 'sub.domain.org', 'another.net'] },
			},
		]);
	});

	it.each([
		[{}, false],
		[
			{
				country: 'US',
			},
			true,
		],
		[
			{
				city: 'NYC',
			},
			true,
		],
		[
			{
				region: 'NY',
			},
			true,
		],
	])(
		'formats web_search with allowed domains and %s user location',
		(userLocation, hasUserLocation) => {
			const tools = formatBuiltInTools({
				webSearch: {
					searchContextSize: 'high',
					allowedDomains: 'example.com, sub.domain.org , , another.net',
					...userLocation,
				},
			} as unknown as IDataObject);

			const commonData = {
				type: 'web_search',
				search_context_size: 'high',
				filters: { allowed_domains: ['example.com', 'sub.domain.org', 'another.net'] },
			};
			if (hasUserLocation) {
				expect(tools).toEqual([
					expect.objectContaining({ ...commonData, user_location: expect.anything() }),
				]);
			} else {
				expect(tools).toEqual([
					expect.objectContaining({ ...commonData, user_location: undefined }),
				]);
			}
		},
	);

	it('adds code_interpreter tool when enabled', () => {
		const tools = formatBuiltInTools({ codeInterpreter: true } as unknown as IDataObject);
		expect(tools).toEqual([
			{
				type: 'code_interpreter',
				container: { type: 'auto' },
			},
		]);
	});

	it('formats file_search tool with parsed vector_store_ids and filters', () => {
		const tools = formatBuiltInTools({
			fileSearch: {
				vectorStoreIds: '["vs1","vs2"]',
				filters: '{"file_types":["pdf"],"tags":["t1"]}',
				maxResults: 50,
			},
		} as unknown as IDataObject);

		expect(tools).toEqual([
			{
				type: 'file_search',
				vector_store_ids: ['vs1', 'vs2'],
				filters: { file_types: ['pdf'], tags: ['t1'] },
				max_num_results: 50,
			},
		]);
	});

	it('omits filters when empty string provided in file_search', () => {
		const tools = formatBuiltInTools({
			fileSearch: { vectorStoreIds: '["only"]', filters: '', maxResults: 3 },
		} as unknown as IDataObject);
		expect(tools).toEqual([
			{
				type: 'file_search',
				vector_store_ids: ['only'],
				filters: undefined,
				max_num_results: 3,
			},
		]);
	});
});

describe('prepareAdditionalResponsesParams', () => {
	it('maps simple scalar fields and conversation id', () => {
		const body = prepareAdditionalResponsesParams({
			promptCacheKey: 'cache-1',
			safetyIdentifier: 'safe-1',
			serviceTier: 'default',
			topLogprobs: 5,
			conversationId: 'conv-123',
		} as unknown as IDataObject);

		expect(body).toEqual({
			prompt_cache_key: 'cache-1',
			safety_identifier: 'safe-1',
			service_tier: 'default',
			top_logprobs: 5,
			conversation: 'conv-123',
		});
	});

	it('parses metadata JSON', () => {
		const body = prepareAdditionalResponsesParams({
			metadata: '{"a":1}',
		} as unknown as IDataObject);
		expect(body).toEqual({ metadata: { a: 1 } });
	});

	it('builds prompt config with variables JSON', () => {
		const body = prepareAdditionalResponsesParams({
			promptConfig: {
				promptOptions: {
					promptId: 'p1',
					version: 'v2',
					variables: '{"x":true,"y":2}',
				},
			},
		} as unknown as IDataObject);

		expect(body).toEqual({
			prompt: {
				id: 'p1',
				version: 'v2',
				variables: { x: true, y: 2 },
			},
		});
	});

	it('sets text format for json_schema with parsed schema and verbosity', () => {
		const body = prepareAdditionalResponsesParams({
			textFormat: {
				textOptions: {
					type: 'json_schema',
					name: 'MySchema',
					schema: '{"type":"object","properties":{"a":{"type":"number"}}}',
					verbosity: 'low',
				},
			},
		} as unknown as IDataObject);

		expect(body).toEqual({
			text: {
				verbosity: 'low',
				format: {
					type: 'json_schema',
					name: 'MySchema',
					schema: { type: 'object', properties: { a: { type: 'number' } } },
				},
			},
		});
	});

	it('sets text format for json_object and text', () => {
		const jsonObj = prepareAdditionalResponsesParams({
			textFormat: { textOptions: { type: 'json_object', verbosity: 'medium' } },
		} as unknown as IDataObject);
		expect(jsonObj).toEqual({ text: { verbosity: 'medium', format: { type: 'json_object' } } });

		const text = prepareAdditionalResponsesParams({
			textFormat: { textOptions: { type: 'text', verbosity: 'high' } },
		} as unknown as IDataObject);
		expect(text).toEqual({ text: { verbosity: 'high', format: { type: 'text' } } });
	});

	it('sets reasoning effort', () => {
		const body = prepareAdditionalResponsesParams({
			reasoningEffort: 'low',
		} as unknown as IDataObject);
		expect(body).toEqual({ reasoning: { effort: 'low' } });
	});
});
