/**
 * Can be used to test chat models outside of n8n nodes.
 * Example: npx tsx run.ts --generate "What is the weather in Tokyo?"
 */

import dotenv from 'dotenv';
import { createAgent, HumanMessage, tool } from 'langchain';
import z from 'zod';

import { LangchainAdapter } from 'src/adapters/langchain-chat-model';

import { OpenAIChatModel } from './models/openai';

dotenv.config();

function parseArgs() {
	const args = process.argv.slice(2);
	const parsed: {
		generate: boolean;
		stream: boolean;
		prompt: string;
		model: string;
	} = {
		generate: false,
		stream: false,
		prompt: '',
		model: 'openai',
	};

	const promptParts: string[] = [];

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		// Check if it's a flag
		if (arg.startsWith('--')) {
			switch (arg) {
				case '--generate':
					parsed.generate = true;
					break;
				case '--stream':
					parsed.stream = true;
					break;
				case '--model':
					if (i + 1 < args.length) {
						const modelValue = args[++i];
						if (modelValue === 'openai') {
							parsed.model = modelValue;
						} else {
							console.error(`Invalid model: ${modelValue}. Only 'openai' is supported.`);
							process.exit(1);
						}
					}
					break;
				case '--help':
					console.log(`
Usage: node run.ts [options] <prompt>

Arguments:
  <prompt>            The prompt text (required)

Options:
  --generate          Enable generate mode
  --stream            Enable stream mode
  --model <name>      Choose model (only 'openai' is supported) (default: 'openai')
  --help              Show this help message

Examples:
  node run.ts --generate What is the weather in Tokyo?
  node run.ts --stream --model openai Tell me a joke
  node run.ts --generate --stream What's the weather in Paris
					`);
					process.exit(0);
					break;
				default:
					console.error(`Unknown option: ${arg}`);
					process.exit(1);
			}
		} else {
			// Not a flag, so it's part of the prompt
			promptParts.push(arg);
		}
	}

	parsed.prompt = promptParts.join(' ');

	if (!parsed.prompt) {
		console.error('Error: Prompt is required');
		console.log('Run with --help for usage information');
		process.exit(1);
	}

	return parsed;
}

async function main() {
	const { generate, stream, prompt, model } = parseArgs();

	console.log('Configuration:');
	console.log(`  Generate: ${generate}`);
	console.log(`  Stream: ${stream}`);
	console.log(`  Prompt: ${prompt}`);
	console.log(`  Model: ${model}`);
	console.log('');

	const getWeather = tool(
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

	// Create model based on selection
	let chatModel;
	if (model === 'openai') {
		const apiKey = process.env.OPENAI_API_KEY;
		if (!apiKey) {
			throw new Error('OPENAI_API_KEY is not set');
		}
		const openaiChatModel = new OpenAIChatModel('gpt-4o', {
			httpRequest: async (method, url, body, headers) => {
				const response = await fetch(url, {
					method,
					body: JSON.stringify(body),
					headers: {
						...headers,
						Authorization: `Bearer ${apiKey}`,
					},
				});
				if (!response.ok) {
					throw new Error(`Failed to fetch: ${response.statusText}`);
				}
				return {
					body: await response.json(),
				};
			},
			openStream: async (method, url, body, headers) => {
				const response = await fetch(url, {
					method,
					body: JSON.stringify(body),
					headers: {
						...headers,
						Authorization: `Bearer ${apiKey}`,
					},
				});
				if (!response.ok) {
					throw new Error(`Failed to fetch: ${response.statusText}`);
				}
				return {
					body: response.body as ReadableStream<Uint8Array<ArrayBufferLike>>,
				};
			},
		});
		chatModel = new LangchainAdapter(openaiChatModel);
	} else {
		throw new Error(`Unsupported model: ${model}`);
	}

	const agent = createAgent({
		model: chatModel,
		tools: [getWeather],
	});

	if (!generate && !stream) {
		console.error('Error: --generate or --stream is required');
		process.exit(1);
	}
	if (generate) {
		console.log('=====Generate=====');
		console.log(
			await agent.invoke({
				messages: [new HumanMessage(prompt)],
			}),
		);
	}

	if (stream) {
		console.log('=====Stream=====');
		for await (const chunk of await agent.stream(
			{ messages: [{ role: 'user', content: prompt }] },
			{ streamMode: 'messages' },
		)) {
			const [step, content] = Object.entries(chunk)[0];
			console.log(`step: ${step}`);
			console.log(`content: ${JSON.stringify(content, null, 2)}`);
		}
	}
}

main().catch(console.error);
