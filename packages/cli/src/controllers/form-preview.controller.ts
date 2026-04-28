import type { Response } from 'express';
import { InstanceSettings } from 'n8n-core';
import { prepareFormData, prepareFormFields, type FormFieldsParameter } from 'n8n-workflow';

import { FormPreviewRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, RestController } from '@n8n/decorators';

@RestController('/form-preview')
export class FormPreviewController {
	constructor(private readonly instanceSettings: InstanceSettings) {}

	@Post('/', { usesTemplates: true })
	preview(_req: AuthenticatedRequest, res: Response, @Body body: FormPreviewRequestDto) {
		const formFields = prepareFormFields(body.formFields as FormFieldsParameter);
		const data = prepareFormData({
			formTitle: body.formTitle,
			formDescription: body.formDescription,
			formFields,
			testRun: false,
			query: {},
			instanceId: this.instanceSettings.instanceId,
			buttonLabel: body.buttonLabel,
			nodeVersion: body.nodeVersion,
			customCss: body.customCss,
			formSubmittedText: undefined,
			redirectUrl: undefined,
		});
		res.render('form-trigger', data);
	}
}
