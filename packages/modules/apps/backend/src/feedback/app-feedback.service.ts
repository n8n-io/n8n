import type { AppBindingKind, AppFeedbackCategory } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp, type HttpRequestClient } from '@n8n/backend-network';
import { UrlService } from '@n8n/backend-services';
import type { Person } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError, ServiceUnavailableError } from '@n8n/errors';
import { InstanceSettings } from 'n8n-core';
import { randomUUID } from 'node:crypto';

import { AppRepository } from '../app.repository';
import { AppsConfig } from '../apps.config';
import { AppVersionRepository } from '../versions/app-version.repository';

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * The JSON body that the feedback collector receives. The collector writes one
 * row for each report in the "n8n Apps preview feedback" database.
 */
export interface AppFeedbackReport {
	schemaVersion: 1;
	submissionId: string;
	source: 'Apps button';
	submittedAt: string;
	category: AppFeedbackCategory;
	feedback: string;
	user: { id: string; email: string | null };
	instance: { id: string; url: string };
	app: {
		id: string;
		projectId: string;
		name: string;
		bindings: Record<AppBindingKind, number>;
	};
}

@Service()
export class AppFeedbackService {
	private readonly http: HttpRequestClient;

	constructor(
		private readonly config: AppsConfig,
		private readonly apps: AppRepository,
		private readonly versions: AppVersionRepository,
		private readonly urls: UrlService,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
		outboundHttp: OutboundHttp,
	) {
		this.http = outboundHttp.requests({
			// The operator sets this address. The default is a fixed n8n-owned host.
			useDefaultSsrfPolicy: 'unsafe',
			timeout: REQUEST_TIMEOUT_MS,
		});
	}

	get enabled() {
		return this.config.feedbackUrl !== '';
	}

	async send(
		user: Person,
		projectId: string,
		appId: string,
		input: { category: AppFeedbackCategory; feedback: string },
	): Promise<{ submissionId: string }> {
		if (!this.enabled) throw new NotFoundError('App feedback is not enabled.');

		const report = await this.buildReport(user, projectId, appId, input);
		try {
			await this.http.request({
				method: 'POST',
				url: this.config.feedbackUrl,
				body: report,
				json: true,
				disableFollowRedirect: true,
			});
		} catch (error) {
			this.logger.warn('Could not send app feedback.', {
				submissionId: report.submissionId,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new ServiceUnavailableError('Could not send your feedback. Try again later.');
		}
		return { submissionId: report.submissionId };
	}

	private async buildReport(
		user: Person,
		projectId: string,
		appId: string,
		input: { category: AppFeedbackCategory; feedback: string },
	): Promise<AppFeedbackReport> {
		const app = await this.apps.findInProject(projectId, appId);
		if (!app) throw new NotFoundError('App not found');

		const draft = app.draftVersionId
			? await this.versions.findVersionById(app.draftVersionId)
			: null;
		const bindings: Record<AppBindingKind, number> = { workflow: 0, dataTable: 0, agent: 0 };
		for (const binding of draft?.bindings ?? []) bindings[binding.kind]++;

		return {
			schemaVersion: 1,
			submissionId: randomUUID(),
			source: 'Apps button',
			submittedAt: new Date().toISOString(),
			category: input.category,
			feedback: input.feedback,
			user: { id: user.id, email: user.email ?? null },
			instance: { id: this.instanceSettings.instanceId, url: this.urls.getInstanceBaseUrl() },
			app: { id: app.id, projectId, name: app.name, bindings },
		};
	}
}
