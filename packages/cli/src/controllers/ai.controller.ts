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
		const { prompt, schema } = req.body;

		try {
			const resp = await axios({
				method: 'post',
				url: this.endpoint,
				data: {
					prompt,
					schema,
				},
				headers: {
					authorization: this.authorization,
				},
			});

			const code = (resp.data as { code: string }).code;
			const mode = (resp.data as { mode: string }).mode;

			return {
				code,
				mode,
				isValid: this.validateGeneratedCode(code),
			};
		} catch (error) {
			throw new Error(`Failed to generate code: ${error}`);
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
