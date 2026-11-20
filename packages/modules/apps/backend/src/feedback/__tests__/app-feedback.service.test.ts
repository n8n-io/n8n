import type { Logger } from '@n8n/backend-common';
import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import type { UrlService } from '@n8n/backend-services';
import { Person } from '@n8n/db';
import { NotFoundError, ServiceUnavailableError } from '@n8n/errors';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { App } from '../../app.entity';
import type { AppRepository } from '../../app.repository';
import type { AppsConfig } from '../../apps.config';
import type { AppVersion } from '../../versions/app-version.entity';
import type { AppVersionRepository } from '../../versions/app-version.repository';
import { AppFeedbackService } from '../app-feedback.service';

const FEEDBACK_URL = 'https://feedback.example.com/intake';
const user = Object.assign(new Person(), { id: 'user-1', email: 'ada@example.com' });
const input = { category: 'bug' as const, feedback: 'The preview does not load.' };

function createService({ feedbackUrl = FEEDBACK_URL } = {}) {
	const http = mock<HttpRequestClient>();
	const outboundHttp = mock<OutboundHttp>();
	outboundHttp.requests.mockReturnValue(http);
	const apps = mock<AppRepository>();
	const versions = mock<AppVersionRepository>();
	apps.findInProject.mockResolvedValue(
		mock<App>({ id: 'app-1', name: 'Expense tracker', draftVersionId: 'version-1' }),
	);
	versions.findVersionById.mockResolvedValue(
		mock<AppVersion>({
			bindings: [
				{ kind: 'workflow', key: 'approve', workflowId: 'wf-1' },
				{ kind: 'workflow', key: 'reject', workflowId: 'wf-2' },
				{ kind: 'dataTable', key: 'expenses', dataTableId: 'dt-1', permissions: ['read'] },
			],
		}),
	);
	const service = new AppFeedbackService(
		mock<AppsConfig>({ feedbackUrl }),
		apps,
		versions,
		mock<UrlService>({ getInstanceBaseUrl: () => 'https://acme.app.n8n.cloud' }),
		mock<InstanceSettings>({ instanceId: 'instance-1' }),
		mock<Logger>(),
		outboundHttp,
	);
	return { service, http, apps };
}

describe('AppFeedbackService', () => {
	it('sends the feedback with the user, instance and app context', async () => {
		const { service, http } = createService();

		const { submissionId } = await service.send(user, 'project-1', 'app-1', input);

		expect(http.request).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'POST',
				url: FEEDBACK_URL,
				disableFollowRedirect: true,
				body: expect.objectContaining({
					schemaVersion: 1,
					submissionId,
					source: 'Apps button',
					category: 'bug',
					feedback: 'The preview does not load.',
					user: { id: 'user-1', email: 'ada@example.com' },
					instance: { id: 'instance-1', url: 'https://acme.app.n8n.cloud' },
					app: {
						id: 'app-1',
						projectId: 'project-1',
						name: 'Expense tracker',
						bindings: { workflow: 2, dataTable: 1, agent: 0 },
					},
				}),
			}),
		);
	});

	it('rejects feedback when no feedback address is set', async () => {
		const { service, http } = createService({ feedbackUrl: '' });

		expect(service.enabled).toBe(false);
		await expect(service.send(user, 'project-1', 'app-1', input)).rejects.toThrow(NotFoundError);
		expect(http.request).not.toHaveBeenCalled();
	});

	it('rejects feedback for an app outside the project', async () => {
		const { service, http, apps } = createService();
		apps.findInProject.mockResolvedValue(null);

		await expect(service.send(user, 'project-1', 'app-1', input)).rejects.toThrow(NotFoundError);
		expect(http.request).not.toHaveBeenCalled();
	});

	it('returns a temporary error when the collector does not accept the feedback', async () => {
		const { service, http } = createService();
		http.request.mockRejectedValue(new Error('502 Bad Gateway'));

		await expect(service.send(user, 'project-1', 'app-1', input)).rejects.toThrow(
			ServiceUnavailableError,
		);
	});
});
