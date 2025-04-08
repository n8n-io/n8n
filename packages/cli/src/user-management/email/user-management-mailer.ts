import { GlobalConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import Handlebars from 'handlebars';
import { Logger } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';
import { join as pathJoin } from 'path';

import { inTest } from '@/constants';
import type { User } from '@/databases/entities/user';
import { UserRepository } from '@/databases/repositories/user.repository';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { EventService } from '@/events/event.service';
import { UrlService } from '@/services/url.service';
import { toError } from '@/utils';

import type { InviteEmailData, PasswordResetData, SendEmailResult } from './interfaces';
import { NodeMailer } from './node-mailer';

type Template = HandlebarsTemplateDelegate<unknown>;
type TemplateName =
	| 'user-invited'
	| 'password-reset-requested'
	| 'workflow-shared'
	| 'credentials-shared';

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

	async notifyWorkflowShared({
		sharer,
		newShareeIds,
		workflow,
	}: {
		sharer: User;
		newShareeIds: string[];
		workflow: IWorkflowBase;
	}): Promise<SendEmailResult> {
		if (!this.mailer) return { emailSent: false };

		const recipients = await this.userRepository.getEmailsByIds(newShareeIds);

		if (recipients.length === 0) return { emailSent: false };

		const emailRecipients = recipients.map(({ email }) => email);

		const populateTemplate = await this.getTemplate('workflow-shared');

		const baseUrl = this.urlService.getInstanceBaseUrl();

		try {
			const result = await this.mailer.sendMail({
				emailRecipients,
				subject: `${sharer.firstName} has shared an n8n workflow with you`,
				body: populateTemplate({
					workflowName: workflow.name,
					workflowUrl: `${baseUrl}/workflow/${workflow.id}`,
				}),
			});

			if (!result) return { emailSent: false };

			this.logger.info('Sent workflow shared email successfully', { sharerId: sharer.id });

			this.eventService.emit('user-transactional-email-sent', {
				userId: sharer.id,
				messageType: 'Workflow shared',
				publicApi: false,
			});

			return result;
		} catch (e) {
			this.eventService.emit('email-failed', {
				user: sharer,
				messageType: 'Workflow shared',
				publicApi: false,
			});

			const error = toError(e);

			throw new InternalServerError(`Please contact your administrator: ${error.message}`, e);
		}
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
		if (!this.mailer) return { emailSent: false };

		const recipients = await this.userRepository.getEmailsByIds(newShareeIds);

		if (recipients.length === 0) return { emailSent: false };

		const emailRecipients = recipients.map(({ email }) => email);

		const populateTemplate = await this.getTemplate('credentials-shared');

		const baseUrl = this.urlService.getInstanceBaseUrl();

		try {
			const result = await this.mailer.sendMail({
				emailRecipients,
				subject: `${sharer.firstName} has shared an n8n credential with you`,
				body: populateTemplate({
					credentialsName,
					credentialsListUrl: `${baseUrl}/home/credentials`,
				}),
			});

			if (!result) return { emailSent: false };

			this.logger.info('Sent credentials shared email successfully', { sharerId: sharer.id });

			this.eventService.emit('user-transactional-email-sent', {
				userId: sharer.id,
				messageType: 'Credentials shared',
				publicApi: false,
			});

			return result;
		} catch (e) {
			this.eventService.emit('email-failed', {
				user: sharer,
				messageType: 'Credentials shared',
				publicApi: false,
			});

			const error = toError(e);

			throw new InternalServerError(`Please contact your administrator: ${error.message}`, e);
		}
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
