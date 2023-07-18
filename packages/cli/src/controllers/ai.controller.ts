import type { Request } from 'express';
import { Authorized, Post, RestController } from '@/decorators';
import type { IDataObject, ILogger } from 'n8n-workflow';
import { Script } from 'vm';
import config from '@/config';
import axios from 'axios';

type GenerateCodeRequest = Request<
	{},
	{},
	{
		prompt: string;
		schema: IDataObject;
	}
>;

type GenerateCurlRequest = Request<
	{},
	{},
	{
		prompt: string;
		service: string;
	}
>;

if (!config.getEnv('ai.enabled')) {
	console.error('AI endpoints only allowed when AI is enabled');
	process.exit(1);
} else {
	console.log('AI endpoints enabled');
}

@Authorized()
@RestController('/ai')
export class AiController {
	private readonly logger: ILogger;

	private readonly endpoint: string;

	private readonly authorization: string;

	constructor({ logger }: { logger: ILogger }) {
		this.logger = logger;
		this.authorization = config.getEnv('ai.authorization');
		this.endpoint = config.getEnv('ai.endpoint');
	}

	@Post('/generate-code')
	async generatePrompt(req: GenerateCodeRequest) {
		console.log('Received: ', req.body.prompt, req.body.schema);
		const generatedCode = 'console.log("Hello world!")';

		return {
			code: generatedCode,
			isValid: this.validateGeneratedCode(generatedCode),
		};
	}

	@Post('/generate-curl')
	async generateCurl(req: GenerateCurlRequest) {
		try {
			const { prompt, service } = req.body;
			const resp = await axios({
				method: 'post',
				url: `${this.endpoint}/generate-curl`,
				data: {
					prompt,
					service,
				},
				headers: {
					authorization: this.authorization,
				},
			});

			return resp.data as { curl: string };
		} catch (error) {
			throw new Error(`Failed to generate curl: ${error}`);
		}
	}

	// Validates the generated code by setting it up in a sandbox
	// this doesn't execute it, just checks if it's valid
	validateGeneratedCode(code: string) {
		try {
			new Script(code);

			return true;
		} catch (error) {
			this.logger.error(`Generated code is invalid: ${error}`);
			return false;
		}
	}
}
