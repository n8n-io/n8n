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
		if (body.isCompletion) {
			const instanceId = this.instanceSettings.instanceId;
			const utm_campaign = instanceId ? `&utm_campaign=${instanceId}` : '';
			res.render('form-trigger-completion', {
				title: body.formTitle,
				message: body.formDescription,
				formTitle: body.formTitle,
				appendAttribution: true,
				n8nWebsiteLink: `https://n8n.io/?utm_source=n8n-internal&utm_medium=form-trigger${utm_campaign}`,
				responseText: '',
				responseBinary: encodeURIComponent(JSON.stringify('')),
				dangerousCustomCss: '.container { padding-bottom: var(--padding-container-top); }',
				redirectUrl: undefined,
			});
			return;
		}

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
