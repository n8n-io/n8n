import type { Response } from 'express';
import { type FormFieldsParameter } from 'n8n-workflow';

import { FormPreviewRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, RestController } from '@n8n/decorators';

import { FormPreviewService } from '@/services/form-preview.service';

@RestController('/form-preview')
export class FormPreviewController {
	constructor(private readonly formPreviewService: FormPreviewService) {}

	// Render markup is built by the shared FormPreviewService (reused by the Instance AI forms tool).
	@Post('/', { usesTemplates: true })
	preview(_req: AuthenticatedRequest, res: Response, @Body body: FormPreviewRequestDto) {
		const { template, data } = this.formPreviewService.buildRenderInstruction({
			...body,
			formFields: body.formFields as FormFieldsParameter,
		});
		res.render(template, data);
	}
}
