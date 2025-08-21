import { inTest, Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { ProjectRole, User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import Handlebars from 'handlebars';
import type { IWorkflowBase } from 'n8n-workflow';
import { join as pathJoin } from 'path';

import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { UrlService } from '@/services/url.service';
import { toError } from '@/utils';

import type { InviteEmailData, PasswordResetData, SendEmailResult } from './interfaces';
import { NodeMailer } from './node-mailer';

type Template = HandlebarsTemplateDelegate<unknown>;
type TemplateName =
	| 'user-invited'
	| 'password-reset-requested'
	| 'workflow-shared'
	| 'credentials-shared'
	| 'project-shared';

@Service()
export class UserManagementMailer {
	readonly isEmailSetUp: boolean;

	readonly templateOverrides: GlobalConfig['userManagement']['emails']['template'];

	readonly templatesCache: Partial<Record<TemplateName, Template>> = {};

	readonly mailer: NodeMailer | undefined;

	constructor(
		globalConfig: GlobalConfig,
		private readonly logger: Logger,
		private readonly userRepository: UserRepository,
		private readonly urlService: UrlService,
		private readonly eventService: EventService,
	) {
		const emailsConfig = globalConfig.userManagement.emails;
		this.isEmailSetUp = emailsConfig.mode === 'smtp' && emailsConfig.smtp.host !== '';
		this.templateOverrides = emailsConfig.template;

		// Other implementations can be used in the future.
		if (this.isEmailSetUp) {
			this.mailer = Container.get(NodeMailer);
		}
	}

	async invite(inviteEmailData: InviteEmailData): Promise<SendEmailResult> {
		if (!this.mailer) return { emailSent: false };

		const template = await this.getTemplate('user-invited');
		return await this.mailer.sendMail({
			emailRecipients: inviteEmailData.email,
			subject: 'You have been invited to n8n',
			body: template({ ...this.basePayload, ...inviteEmailData }),
		});
	}

	async passwordReset(passwordResetData: PasswordResetData): Promise<SendEmailResult> {
		if (!this.mailer) return { emailSent: false };

		const template = await this.getTemplate('password-reset-requested');
		return await this.mailer.sendMail({
			emailRecipients: passwordResetData.email,
			subject: 'n8n password reset',
			body: template({ ...this.basePayload, ...passwordResetData }),
		});
	}

	private async sendNotificationEmails<T extends { email: string }>({
		mailerTemplate,
		recipients,
		sharer,
		getTemplateData,
		subjectBuilder,
		messageType,
	}: {
		mailerTemplate: TemplateName;
		recipients: T[];
		sharer: User;
		getTemplateData: (recipient: T) => Record<string, any>;
		subjectBuilder: () => string;
		messageType: RelayEventMap['user-transactional-email-sent']['messageType'];
	}): Promise<SendEmailResult> {
		if (!this.mailer) return { emailSent: false };
		if (recipients.length === 0) return { emailSent: false };

		const populateTemplate = await this.getTemplate(mailerTemplate);

		try {
			const promises = recipients.map(async (recipient) => {
				const templateData = getTemplateData(recipient);
				return await this.mailer!.sendMail({
					emailRecipients: recipient.email,
					subject: subjectBuilder(),
					body: populateTemplate(templateData),
				});
			});

			const results = await Promise.allSettled(promises);
			const errors = results.filter((result) => result.status === 'rejected');

			this.logger.info(
				`Sent ${messageType} email ${errors.length ? 'with errors' : 'successfully'}`,
				{
					sharerId: sharer.id,
				},
			);

			this.eventService.emit('user-transactional-email-sent', {
				userId: sharer.id,
				messageType,
				publicApi: false,
			});

			return {
				emailSent: true,
				errors: errors.map((e) => e.reason as string),
			};
		} catch (e) {
			this.eventService.emit('email-failed', {
				user: sharer,
				messageType,
				publicApi: false,
			});

			const error = toError(e);
			throw new InternalServerError(`Please contact your administrator: ${error.message}`, e);
		}
	}

	async notifyWorkflowShared({
		sharer,
		newShareeIds,
		workflow,
	}: {
		sharer: User;
		newShareeIds: string[];
		workflow: IWorkflowBase;
	}): Promise<SendEmailResult> {
		const recipients = await this.userRepository.getEmailsByIds(newShareeIds);
		const baseUrl = this.urlService.getInstanceBaseUrl();

		return await this.sendNotificationEmails({
			mailerTemplate: 'workflow-shared',
			recipients,
			sharer,
			getTemplateData: () => ({
				workflowName: workflow.name,
				workflowUrl: `${baseUrl}/workflow/${workflow.id}`,
			}),
			subjectBuilder: () => `${sharer.firstName} has shared an n8n workflow with you`,
			messageType: 'Workflow shared',
		});
	}

	async notifyCredentialsShared({
		sharer,
		newShareeIds,
		credentialsName,
	}: {
		sharer: User;
		newShareeIds: string[];
		credentialsName: string;
	}): Promise<SendEmailResult> {
		const recipients = await this.userRepository.getEmailsByIds(newShareeIds);
		const baseUrl = this.urlService.getInstanceBaseUrl();

		return await this.sendNotificationEmails({
			mailerTemplate: 'credentials-shared',
			recipients,
			sharer,
			getTemplateData: () => ({
				credentialsName,
				credentialsListUrl: `${baseUrl}/home/credentials`,
			}),
			subjectBuilder: () => `${sharer.firstName} has shared an n8n credential with you`,
			messageType: 'Credentials shared',
		});
	}

	async notifyProjectShared({
		sharer,
		newSharees,
		project,
	}: {
		sharer: User;
		newSharees: Array<{ userId: string; role: ProjectRole }>;
		project: { id: string; name: string };
	}): Promise<SendEmailResult> {
		const recipients = await this.userRepository.getEmailsByIds(newSharees.map((s) => s.userId));
		const baseUrl = this.urlService.getInstanceBaseUrl();

		// Merge recipient data with role
		const recipientsData = newSharees
			.map((sharee) => {
				const recipient = recipients.find((r) => r.id === sharee.userId);
				if (!recipient) return null;
				return {
					email: recipient.email,
					role: sharee.role.split('project:')?.[1] ?? sharee.role,
				};
			})
			.filter(Boolean) as Array<{ email: string; role: string }>;

		return await this.sendNotificationEmails({
			mailerTemplate: 'project-shared',
			recipients: recipientsData,
			sharer,
			getTemplateData: (recipient) => ({
				role: recipient.role,
				projectName: project.name,
				projectUrl: `${baseUrl}/projects/${project.id}`,
			}),
			subjectBuilder: () => `${sharer.firstName} has invited you to a project`,
			messageType: 'Project shared',
		});
	}

	async getTemplate(templateName: TemplateName): Promise<Template> {
		let template = this.templatesCache[templateName];
		if (!template) {
			const fileExtension = inTest ? 'mjml' : 'handlebars';
			const templateOverride = this.templateOverrides[templateName];
			const templatePath =
				templateOverride && existsSync(templateOverride)
					? templateOverride
					: pathJoin(__dirname, `templates/${templateName}.${fileExtension}`);
			const markup = await readFile(templatePath, 'utf-8');
			template = Handlebars.compile(markup);
			this.templatesCache[templateName] = template;
		}
		return template;
	}

	private get basePayload() {
		const baseUrl = this.urlService.getInstanceBaseUrl();
		const domain = new URL(baseUrl).hostname;
		return { baseUrl, domain };
	}
}
