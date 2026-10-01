import type { AiModelSelectorMenuItem } from './AiModelSelectorDropdown.types';

export const items: AiModelSelectorMenuItem[] = [
	{
		id: 'openai',
		label: 'OpenAI',
		children: [
			{
				id: 'openai::gpt-5.2',
				label: 'GPT-5.2',
				data: {
					fullName: 'GPT-5.2',
					description: 'Context window: 400,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'openai::gpt-5-pro',
				label: 'GPT-5 Pro',
				data: {
					fullName: 'GPT-5 Pro',
					description: 'Context window: 400,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'openai::gpt-5-mini',
				label: 'GPT-5 Mini',
				data: {
					fullName: 'GPT-5 Mini',
					description: 'Context window: 400,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'openai::gpt-5-nano',
				label: 'GPT-5 Nano',
				data: {
					fullName: 'GPT-5 Nano',
					description: 'Context window: 400,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'openai::gpt-5-chat',
				label: 'GPT-5 Chat',
				data: {
					fullName: 'GPT-5 Chat',
					description: 'Context window: 128,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'openai::gpt-5.1',
				label: 'GPT-5.1',
				data: {
					fullName: 'GPT-5.1',
					description: 'Context window: 400,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'openai::gpt-5.1-mini',
				label: 'GPT-5.1 Mini',
				data: {
					fullName: 'GPT-5.1 Mini',
					description: 'Context window: 400,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'openai::gpt-5.1-nano',
				label: 'GPT-5.1 Nano',
				data: {
					fullName: 'GPT-5.1 Nano',
					description: 'Context window: 400,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'openai::gpt-4o',
				label: 'GPT-4o',
				data: {
					fullName: 'GPT-4o',
					description: 'Context window: 128,000 tokens; supports attachments.',
				},
			},
			{
				id: 'openai::gpt-4o-mini',
				label: 'GPT-4o Mini',
				data: {
					fullName: 'GPT-4o Mini',
					description: 'Context window: 128,000 tokens; supports attachments.',
				},
			},
			{
				id: 'openai::gpt-4.1',
				label: 'GPT-4.1',
				data: {
					fullName: 'GPT-4.1',
					description: 'Context window: 1,000,000 tokens; supports attachments.',
				},
			},
			{
				id: 'openai::gpt-4.1-mini',
				label: 'GPT-4.1 Mini',
				data: {
					fullName: 'GPT-4.1 Mini',
					description: 'Context window: 1,000,000 tokens; supports attachments.',
				},
			},
			{
				id: 'openai::gpt-4.1-nano',
				label: 'GPT-4.1 Nano',
				data: {
					fullName: 'GPT-4.1 Nano',
					description: 'Context window: 1,000,000 tokens; supports attachments.',
				},
			},
			{
				id: 'openai::o3',
				label: 'o3',
				data: {
					fullName: 'o3',
					description: 'Context window: 200,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'openai::o3-mini',
				label: 'o3 Mini',
				data: {
					fullName: 'o3 Mini',
					description: 'Context window: 200,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'openai::o4-mini',
				label: 'o4 Mini',
				data: {
					fullName: 'o4 Mini',
					description: 'Context window: 200,000 tokens; supports attachments; reasoning model.',
				},
			},
		],
	},
	{
		id: 'anthropic',
		label: 'Anthropic',
		children: [
			{
				id: 'anthropic::claude-opus-4-5',
				label: 'Claude Opus 4.5 (latest)',
				data: {
					fullName: 'Claude Opus 4.5 (latest)',
					description: 'Context window: 200,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'anthropic::claude-sonnet-4-6',
				label: 'Claude Sonnet 4.6',
				data: {
					fullName: 'Claude Sonnet 4.6',
					description: 'Context window: 1,000,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'anthropic::claude-haiku-4-5',
				label: 'Claude Haiku 4.5 (latest)',
				data: {
					fullName: 'Claude Haiku 4.5 (latest)',
					description: 'Context window: 200,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'anthropic::claude-sonnet-4-0',
				label: 'Claude Sonnet 4 (latest)',
				data: {
					fullName: 'Claude Sonnet 4 (latest)',
					description: 'Context window: 200,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'anthropic::claude-3-5-haiku-latest',
				label: 'Claude Haiku 3.5 (latest)',
				data: {
					fullName: 'Claude Haiku 3.5 (latest)',
					description: 'Context window: 200,000 tokens; supports attachments.',
				},
			},
		],
	},
	{
		id: 'openrouter',
		label: 'OpenRouter',
		children: [
			{
				id: 'openrouter::openai/gpt-5.1',
				label: 'GPT-5.1',
				data: {
					fullName: 'GPT-5.1',
					description: 'Context window: 400,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'openrouter::anthropic/claude-sonnet-4.5',
				label: 'Claude Sonnet 4.5 (latest)',
				data: {
					fullName: 'Claude Sonnet 4.5 (latest)',
					description: 'Context window: 1,000,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'openrouter::google/gemini-3.1-pro-preview',
				label: 'Gemini 3.1 Pro Preview',
				data: {
					fullName: 'Gemini 3.1 Pro Preview',
					description: 'Context window: 1,048,576 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'openrouter::deepseek/deepseek-chat-v3.1',
				label: 'DeepSeek V3.1',
				data: {
					fullName: 'DeepSeek V3.1',
					description: 'Context window: 163,840 tokens; reasoning model.',
				},
			},
			{
				id: 'openrouter::meta-llama/llama-3.3-70b-instruct',
				label: 'Llama-3.3-70B-Instruct',
				data: {
					fullName: 'Llama-3.3-70B-Instruct',
					description: 'Context window: 131,072 tokens.',
				},
			},
		],
	},
	{
		id: 'azure',
		label: 'Azure',
		children: [
			{
				id: 'azure::gpt-5-chat',
				label: 'GPT-5 Chat',
				data: {
					fullName: 'GPT-5 Chat',
					description: 'Context window: 128,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'azure::gpt-5-mini',
				label: 'GPT-5 Mini',
				data: {
					fullName: 'GPT-5 Mini',
					description: 'Context window: 272,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'azure::claude-opus-4-5',
				label: 'Claude Opus 4.5',
				data: {
					fullName: 'Claude Opus 4.5',
					description: 'Context window: 200,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'azure::model-router',
				label: 'Model Router',
				data: {
					fullName: 'Model Router',
					description: 'Context window: 128,000 tokens; supports attachments.',
				},
			},
			{
				id: 'azure::deepseek-r1-0528',
				label: 'DeepSeek-R1-0528',
				data: {
					fullName: 'DeepSeek-R1-0528',
					description: 'Context window: 163,840 tokens; reasoning model.',
				},
			},
		],
	},
	{
		id: 'vercel',
		label: 'Vercel AI Gateway',
		children: [
			{
				id: 'vercel::openai/gpt-5.1-instant',
				label: 'GPT-5.1 Instant',
				data: {
					fullName: 'GPT-5.1 Instant',
					description: 'Context window: 128,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'vercel::anthropic/claude-sonnet-4.5',
				label: 'Claude Sonnet 4.5',
				data: {
					fullName: 'Claude Sonnet 4.5',
					description: 'Context window: 200,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'vercel::xai/grok-4.1-fast-reasoning',
				label: 'Grok 4.1 Fast Reasoning',
				data: {
					fullName: 'Grok 4.1 Fast Reasoning',
					description: 'Context window: 2,000,000 tokens; reasoning model.',
				},
			},
			{
				id: 'vercel::google/gemini-3-pro-preview',
				label: 'Gemini 3 Pro Preview',
				data: {
					fullName: 'Gemini 3 Pro Preview',
					description: 'Context window: 1,000,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'vercel::deepseek/deepseek-v3.2',
				label: 'DeepSeek V3.2',
				data: {
					fullName: 'DeepSeek V3.2',
					description: 'Context window: 163,842 tokens.',
				},
			},
		],
	},
	{
		id: 'groq',
		label: 'Groq',
		children: [
			{
				id: 'groq::llama-3.3-70b-versatile',
				label: 'Llama 3.3 70B Versatile',
				data: {
					fullName: 'Llama 3.3 70B Versatile',
					description: 'Context window: 131,072 tokens.',
				},
			},
			{
				id: 'groq::openai/gpt-oss-120b',
				label: 'GPT OSS 120B',
				data: {
					fullName: 'GPT OSS 120B',
					description: 'Context window: 131,072 tokens; reasoning model.',
				},
			},
			{
				id: 'groq::moonshotai/kimi-k2-instruct',
				label: 'Kimi K2 Instruct',
				data: {
					fullName: 'Kimi K2 Instruct',
					description: 'Context window: 131,072 tokens.',
				},
			},
			{
				id: 'groq::qwen/qwen3-32b',
				label: 'Qwen3 32B',
				data: {
					fullName: 'Qwen3 32B',
					description: 'Context window: 131,072 tokens; reasoning model.',
				},
			},
			{
				id: 'groq::deepseek-r1-distill-llama-70b',
				label: 'DeepSeek R1 Distill Llama 70B',
				data: {
					fullName: 'DeepSeek R1 Distill Llama 70B',
					description: 'Context window: 131,072 tokens; reasoning model.',
				},
			},
		],
	},
	{
		id: 'xai',
		label: 'xAI',
		children: [
			{
				id: 'xai::grok-4.3',
				label: 'Grok 4.3',
				data: {
					fullName: 'Grok 4.3',
					description: 'Context window: 1,000,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'xai::grok-4.20-0309-reasoning',
				label: 'Grok 4.20 (Reasoning)',
				data: {
					fullName: 'Grok 4.20 (Reasoning)',
					description: 'Context window: 2,000,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'xai::grok-build-0.1',
				label: 'Grok Build 0.1',
				data: {
					fullName: 'Grok Build 0.1',
					description: 'Context window: 256,000 tokens; supports attachments; reasoning model.',
				},
			},
			{
				id: 'xai::grok-imagine-image',
				label: 'Grok Imagine Image',
				data: {
					fullName: 'Grok Imagine Image',
					description: 'Context window: 8,000 tokens; supports attachments.',
				},
			},
			{
				id: 'xai::grok-imagine-video',
				label: 'Grok Imagine Video',
				data: {
					fullName: 'Grok Imagine Video',
					description: 'Context window: 1,024 tokens; supports attachments.',
				},
			},
		],
	},
];
