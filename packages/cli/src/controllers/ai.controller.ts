import type { Request } from 'express';
import { Authorized, Post, RestController } from '@/decorators';
import type { IDataObject } from 'n8n-workflow';
import { Script } from 'vm';

type GenerateCodeRequest = Request<
	{},
	{},
	{
		prompt: string;
		schema: IDataObject;
	}
>;

@Authorized()
@RestController('/ai')
export class AiController {
	@Post('/generate-code')
	async generatePrompt(req: GenerateCodeRequest) {
		console.log('Received: ', req.body.prompt, req.body.schema);
		const generatedCode = 'console.log("Hello world!")';

		return {
			code: generatedCode,
			isValid: this.validateGeneratedCode(generatedCode),
		};
	}

	// Validates the generated code by setting it up in a sandbox
	// this doesn't execute it, just checks if it's valid
	validateGeneratedCode(code: string) {
		try {
			new Script(code);

			return true;
		} catch (error) {
			console.log('Generated code is invalid: ', error);
			return false;
		}
	}
}
