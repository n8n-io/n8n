import type { Request } from 'express';
import { Authorized, Post, RestController } from '@/decorators';
import type { CodeExecutionMode, IDataObject, ILogger } from 'n8n-workflow';
import { Script } from 'vm';
import config from '@/config';
import axios from 'axios';

type GenerateCodeRequest = Request<
	{},
	{},
	{
		prompt: string;
		model: 'gpt-3.5-turbo-16k' | 'gpt-4';
		schema: IDataObject;
	}
>;

type GenerateCodeResponse = {
	code: string;
	mode: CodeExecutionMode;
};

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
		const { prompt, schema, model } = req.body;

		try {
			const response: { data: GenerateCodeResponse } = await axios({
				method: 'post',
				url: this.endpoint + '/generate-code',
				data: {
					prompt,
					model,
					schema,
				},
				headers: {
					authorization: this.authorization,
				},
			});
			const { code, mode } = response.data;

			// TODO: Validate the generated code and retry if invalid?
			return {
				code,
				mode,
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
