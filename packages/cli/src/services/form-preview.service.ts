import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { prepareFormData, prepareFormFields, type FormFieldsParameter } from 'n8n-workflow';
import { join } from 'path';

import { TEMPLATES_DIR } from '@/constants';
import { createHandlebarsEngine } from '@/utils/handlebars.util';

/** Normalized inputs for a form-trigger / form-completion preview render. */
export interface FormPreviewInput {
	formTitle?: string;
	formDescription?: string;
	formFields?: FormFieldsParameter;
	buttonLabel?: string;
	nodeVersion?: number;
	customCss?: string;
	appendAttribution?: boolean;
	isCompletion?: boolean;
	respondWith?: string;
	responseText?: string;
	redirectUrl?: string;
}

type RenderInstruction = { template: string; data: Record<string, unknown> };

/**
 * The express-handlebars engine's published type describes its `options` arg as
 * `ConfigOptions`, but at runtime it receives the template locals (exactly what
 * express passes from `res.render`). We type the standalone call by its real
 * runtime contract.
 */
type RenderEngine = (
	viewPath: string,
	locals: Record<string, unknown>,
	callback: (err: unknown, rendered?: string) => void,
) => void;

/**
 * Renders the `form-trigger` / `form-trigger-completion` handlebars templates
 * from unsaved node parameters. Shared between the REST `form-preview`
 * controller (renders to the HTTP response) and the Instance AI forms adapter
 * (renders to an HTML string) — the single source of truth for preview markup,
 * mirroring how `NodeResourceExplorerService` backs both a REST path and a tool.
 */
@Service()
export class FormPreviewService {
	private readonly engine = createHandlebarsEngine() as unknown as RenderEngine;

	constructor(private readonly instanceSettings: InstanceSettings) {}

	/** Build the template name + view data for a preview. Consumed by the
	 *  controller (via `res.render`) and by `render()` below. */
	buildRenderInstruction(body: FormPreviewInput): RenderInstruction {
		if (body.isCompletion) {
			const instanceId = this.instanceSettings.instanceId;
			const utm_campaign = instanceId ? `&utm_campaign=${instanceId}` : '';
			const completionCss = [
				body.customCss,
				'.container { padding-bottom: var(--padding-container-top); }',
			]
				.filter(Boolean)
				.join('\n');
			const respondWith = body.respondWith ?? 'text';
			return {
				template: 'form-trigger-completion',
				data: {
					title: body.formTitle,
					message: body.formDescription,
					formTitle: body.formTitle,
					appendAttribution: body.appendAttribution ?? true,
					n8nWebsiteLink: `https://n8n.io/?utm_source=n8n-internal&utm_medium=form-trigger${utm_campaign}`,
					responseText: respondWith === 'showText' ? (body.responseText ?? '') : '',
					responseBinary: encodeURIComponent(JSON.stringify('')),
					dangerousCustomCss: completionCss,
					redirectUrl: respondWith === 'redirect' ? body.redirectUrl : undefined,
				},
			};
		}

		const formFields = prepareFormFields(body.formFields ?? []);
		const data = prepareFormData({
			formTitle: body.formTitle ?? '',
			formDescription: body.formDescription ?? '',
			formFields,
			testRun: false,
			query: {},
			instanceId: this.instanceSettings.instanceId,
			buttonLabel: body.buttonLabel,
			nodeVersion: body.nodeVersion,
			customCss: body.customCss,
			appendAttribution: body.appendAttribution ?? true,
			formSubmittedText: undefined,
			redirectUrl: undefined,
		});
		return { template: 'form-trigger', data: data as unknown as Record<string, unknown> };
	}

	/** Render a preview to an HTML string (no HTTP response involved). */
	async render(body: FormPreviewInput): Promise<string> {
		const { template, data } = this.buildRenderInstruction(body);
		const filePath = join(TEMPLATES_DIR, `${template}.handlebars`);
		return await new Promise<string>((resolve, reject) => {
			// express-handlebars' engine is callable standalone; `settings.views`
			// lets it resolve the templates dir without an express app.
			this.engine(filePath, { ...data, settings: { views: TEMPLATES_DIR } }, (err, rendered) => {
				if (err) reject(err instanceof Error ? err : new Error(String(err)));
				else resolve(rendered ?? '');
			});
		});
	}
}
