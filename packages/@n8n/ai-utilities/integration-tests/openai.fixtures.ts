import { tool } from 'langchain';
import { Readable } from 'node:stream';
import z from 'zod';

export const weatherTool = tool(
	({ city }) => {
		return `It's always sunny in ${city}!`;
	},
	{
		name: 'get_weather',
		description: 'Get weather for a given city.',
		schema: z.object({
			city: z.string(),
		}),
	},
);

export const mockToolCallResponse = {
	id: 'resp_02a127c1e73b5fe4016989e989cb188195a27d4911084e4223',
	object: 'response',
	created_at: 1770645897,
	status: 'completed',
	background: false,
	billing: { payer: 'developer' },
	completed_at: 1770645898,
	error: null,
	frequency_penalty: 0,
	incomplete_details: null,
	instructions: null,
	max_output_tokens: null,
	max_tool_calls: null,
	model: 'gpt-4o-2024-08-06',
	output: [
		{
			id: 'fc_02a127c1e73b5fe4016989e98a70b881959fb6cf1d58b5db8b',
			type: 'function_call',
			status: 'completed',
			arguments: '{"city":"Tokyo"}',
			call_id: 'call_YONsRdkCKu8Sh8WGkUiXqlYW',
			name: 'get_weather',
		},
	],
	parallel_tool_calls: true,
	presence_penalty: 0,
	previous_response_id: null,
	prompt_cache_key: null,
	prompt_cache_retention: null,
	reasoning: { effort: null, summary: null },
	safety_identifier: null,
	service_tier: 'default',
	store: false,
	temperature: 1,
	text: { format: { type: 'text' }, verbosity: 'medium' },
	tool_choice: 'auto',
	tools: [
		{
			type: 'function',
			description: 'Get weather for a given city.',
			name: 'get_weather',
			parameters: {
				type: 'object',
				properties: { city: { type: 'string' } },
				required: ['city'],
				additionalProperties: false,
			},
			strict: true,
		},
	],
	top_logprobs: 0,
	top_p: 1,
	truncation: 'disabled',
	usage: {
		input_tokens: 46,
		input_tokens_details: { cached_tokens: 0 },
		output_tokens: 15,
		output_tokens_details: { reasoning_tokens: 0 },
		total_tokens: 61,
	},
	user: null,
	metadata: {},
};

export const mockFinalResponse = {
	id: 'resp_00a8729c01103919016989e98b13888190bca486b9676ce0cd',
	object: 'response',
	created_at: 1770645899,
	status: 'completed',
	background: false,
	billing: { payer: 'developer' },
	completed_at: 1770645899,
	error: null,
	frequency_penalty: 0,
	incomplete_details: null,
	instructions: null,
	max_output_tokens: null,
	max_tool_calls: null,
	model: 'gpt-4o-2024-08-06',
	output: [
		{
			id: 'msg_00a8729c01103919016989e98bb58c81909a9eb194728f1db0',
			type: 'message',
			status: 'completed',
			content: [
				{
					type: 'output_text',
					annotations: [],
					logprobs: [],
					text: "It's always sunny in Tokyo!",
				},
			],
			role: 'assistant',
		},
	],
	parallel_tool_calls: true,
	presence_penalty: 0,
	previous_response_id: null,
	prompt_cache_key: null,
	prompt_cache_retention: null,
	reasoning: { effort: null, summary: null },
	safety_identifier: null,
	service_tier: 'default',
	store: false,
	temperature: 1,
	text: { format: { type: 'text' }, verbosity: 'medium' },
	tool_choice: 'auto',
	tools: [
		{
			type: 'function',
			description: 'Get weather for a given city.',
			name: 'get_weather',
			parameters: {
				type: 'object',
				properties: { city: { type: 'string' } },
				required: ['city'],
				additionalProperties: false,
			},
			strict: true,
		},
	],
	top_logprobs: 0,
	top_p: 1,
	truncation: 'disabled',
	usage: {
		input_tokens: 76,
		input_tokens_details: { cached_tokens: 0 },
		output_tokens: 8,
		output_tokens_details: { reasoning_tokens: 0 },
		total_tokens: 84,
	},
	user: null,
	metadata: {},
};

export const mockStreamToolCallEvents = [
	{
		type: 'event',
		data: {
			type: 'response.created',
			response: {
				id: 'resp_stream_001',
				object: 'response',
				created_at: 1770647361,
				status: 'in_progress',
				model: 'gpt-4o-2024-08-06',
			},
			sequence_number: 0,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.in_progress',
			response: {
				id: 'resp_stream_001',
				status: 'in_progress',
			},
			sequence_number: 1,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.output_item.added',
			item: {
				id: 'fc_stream_001',
				type: 'function_call',
				status: 'in_progress',
				arguments: '',
				call_id: 'call_StreamTest123',
				name: 'get_weather',
			},
			output_index: 0,
			sequence_number: 2,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.function_call_arguments.delta',
			delta: '{"',
			item_id: 'fc_stream_001',
			output_index: 0,
			sequence_number: 3,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.function_call_arguments.delta',
			delta: 'city',
			item_id: 'fc_stream_001',
			output_index: 0,
			sequence_number: 4,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.function_call_arguments.delta',
			delta: '":"',
			item_id: 'fc_stream_001',
			output_index: 0,
			sequence_number: 5,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.function_call_arguments.delta',
			delta: 'Tokyo',
			item_id: 'fc_stream_001',
			output_index: 0,
			sequence_number: 6,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.function_call_arguments.delta',
			delta: '"}',
			item_id: 'fc_stream_001',
			output_index: 0,
			sequence_number: 7,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.function_call_arguments.done',
			arguments: '{"city":"Tokyo"}',
			item_id: 'fc_stream_001',
			output_index: 0,
			sequence_number: 8,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.output_item.done',
			item: {
				id: 'fc_stream_001',
				type: 'function_call',
				status: 'completed',
				arguments: '{"city":"Tokyo"}',
				call_id: 'call_StreamTest123',
				name: 'get_weather',
			},
			output_index: 0,
			sequence_number: 9,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.completed',
			response: {
				id: 'resp_stream_001',
				object: 'response',
				created_at: 1770647361,
				status: 'completed',
				completed_at: 1770647362,
				model: 'gpt-4o-2024-08-06',
				output: [
					{
						id: 'fc_stream_001',
						type: 'function_call',
						status: 'completed',
						arguments: '{"city":"Tokyo"}',
						call_id: 'call_StreamTest123',
						name: 'get_weather',
					},
				],
				usage: {
					input_tokens: 46,
					input_tokens_details: {
						cached_tokens: 0,
					},
					output_tokens: 15,
					output_tokens_details: {
						reasoning_tokens: 0,
					},
					total_tokens: 61,
				},
			},
			sequence_number: 10,
		},
	},
	{
		type: 'done',
		data: null,
	},
];

export const mockStreamFinalResponseEvents = [
	{
		type: 'event',
		data: {
			type: 'response.created',
			response: {
				id: 'resp_stream_002',
				object: 'response',
				created_at: 1770647362,
				status: 'in_progress',
				model: 'gpt-4o-2024-08-06',
			},
			sequence_number: 0,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.in_progress',
			response: {
				id: 'resp_stream_002',
				status: 'in_progress',
			},
			sequence_number: 1,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.output_item.added',
			item: {
				id: 'msg_stream_002',
				type: 'message',
				status: 'in_progress',
				content: [],
				role: 'assistant',
			},
			output_index: 0,
			sequence_number: 2,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.content_part.added',
			content_index: 0,
			item_id: 'msg_stream_002',
			output_index: 0,
			part: {
				type: 'output_text',
				annotations: [],
				logprobs: [],
				text: '',
			},
			sequence_number: 3,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.output_text.delta',
			content_index: 0,
			delta: "It's",
			item_id: 'msg_stream_002',
			logprobs: [],
			output_index: 0,
			sequence_number: 4,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.output_text.delta',
			content_index: 0,
			delta: ' always',
			item_id: 'msg_stream_002',
			logprobs: [],
			output_index: 0,
			sequence_number: 5,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.output_text.delta',
			content_index: 0,
			delta: ' sunny',
			item_id: 'msg_stream_002',
			logprobs: [],
			output_index: 0,
			sequence_number: 6,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.output_text.delta',
			content_index: 0,
			delta: ' in',
			item_id: 'msg_stream_002',
			logprobs: [],
			output_index: 0,
			sequence_number: 7,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.output_text.delta',
			content_index: 0,
			delta: ' Tokyo',
			item_id: 'msg_stream_002',
			logprobs: [],
			output_index: 0,
			sequence_number: 8,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.output_text.delta',
			content_index: 0,
			delta: '!',
			item_id: 'msg_stream_002',
			logprobs: [],
			output_index: 0,
			sequence_number: 9,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.output_text.done',
			content_index: 0,
			item_id: 'msg_stream_002',
			logprobs: [],
			output_index: 0,
			sequence_number: 10,
			text: "It's always sunny in Tokyo!",
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.content_part.done',
			content_index: 0,
			item_id: 'msg_stream_002',
			output_index: 0,
			part: {
				type: 'output_text',
				annotations: [],
				logprobs: [],
				text: "It's always sunny in Tokyo!",
			},
			sequence_number: 11,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.output_item.done',
			item: {
				id: 'msg_stream_002',
				type: 'message',
				status: 'completed',
				content: [
					{
						type: 'output_text',
						annotations: [],
						logprobs: [],
						text: "It's always sunny in Tokyo!",
					},
				],
				role: 'assistant',
			},
			output_index: 0,
			sequence_number: 12,
		},
	},
	{
		type: 'event',
		data: {
			type: 'response.completed',
			response: {
				id: 'resp_stream_002',
				object: 'response',
				created_at: 1770647362,
				status: 'completed',
				completed_at: 1770647363,
				model: 'gpt-4o-2024-08-06',
				output: [
					{
						id: 'msg_stream_002',
						type: 'message',
						status: 'completed',
						content: [
							{
								type: 'output_text',
								annotations: [],
								logprobs: [],
								text: "It's always sunny in Tokyo!",
							},
						],
						role: 'assistant',
					},
				],
				usage: {
					input_tokens: 76,
					input_tokens_details: {
						cached_tokens: 0,
					},
					output_tokens: 8,
					output_tokens_details: {
						reasoning_tokens: 0,
					},
					total_tokens: 84,
				},
			},
			sequence_number: 13,
		},
	},
	{
		type: 'done',
		data: null,
	},
];

export function createSSEStream(events: Array<{ type: string; data: unknown }>) {
	const stream = new Readable({
		read() {},
	});

	let eventIndex = 0;

	function sendData() {
		setTimeout(() => {
			if (eventIndex < events.length) {
				const event = events[eventIndex];
				if (event.type === 'done') {
					stream.push('data: [DONE]\n\n');
					stream.push(null);
				} else {
					stream.push(`data: ${JSON.stringify(event.data)}\n\n`);
				}
				eventIndex++;
				sendData();
			}
		}, 50);
	}

	sendData();
	return stream;
}

export function createMockHttpRequests() {
	return {
		httpRequest: async (
			method: string,
			url: string,
			body?: object,
			headers?: Record<string, string>,
		) => {
			const response = await fetch(url, {
				method,
				body: JSON.stringify(body),
				headers: {
					...headers,
					Authorization: 'Bearer test-api-key',
				},
			});
			const json = await response.json();
			return {
				ok: response.ok,
				status: response.status,
				statusText: response.statusText,
				body: json,
			};
		},
		openStream: async (
			method: string,
			url: string,
			body?: object,
			headers?: Record<string, string>,
		) => {
			const response = await fetch(url, {
				method,
				body: JSON.stringify(body),
				headers: {
					...headers,
					Authorization: 'Bearer test-api-key',
				},
			});
			return {
				ok: response.ok,
				status: response.status,
				statusText: response.statusText,
				body: response.body as ReadableStream<Uint8Array<ArrayBufferLike>>,
			};
		},
	};
}
