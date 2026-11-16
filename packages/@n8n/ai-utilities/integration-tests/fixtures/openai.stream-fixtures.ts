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
