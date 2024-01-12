import { Request } from 'express';
import { Post, RestController } from '@/decorators';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { CurlService, flattenObject } from '@/services/curl.service';

@RestController('/curl')
export class CurlController {
	constructor(private readonly curlService: CurlService) {}

	@Post('/to-json')
	toJson(req: Request<{}, {}, { curlCommand: string }>) {
		try {
			const parameters = this.curlService.toHttpNodeParameters(req.body.curlCommand);
			return flattenObject(parameters, 'parameters');
		} catch (e) {
			throw new BadRequestError('Invalid cURL command');
		}
	}
}
