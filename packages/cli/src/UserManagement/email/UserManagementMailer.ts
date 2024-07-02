import { Container, Service } from 'typedi';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import Handlebars from 'handlebars';
import { join as pathJoin } from 'path';
import { GlobalConfig } from '@n8n/config';

import type { User } from '@db/entities/User';
import type { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { UserRepository } from '@db/repositories/user.repository';
import { InternalHooks } from '@/InternalHooks';
import { Logger } from '@/Logger';
import { UrlService } from '@/services/url.service';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { toError } from '@/utils';

import type { InviteEmailData, PasswordResetData, SendEmailResult } from './Interfaces';
import { NodeMailer } from './NodeMailer';
import { EventRelay } from '@/eventbus/event-relay.service';

type Template = HandlebarsTemplateDelegate<unknown>;
type TemplateName = 'invite' | 'passwordReset' | 'workflowShared' | 'credentialsShared';

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

		const template = await this.getTemplate('invite');
		const result = await this.mailer.sendMail({
			emailRecipients: inviteEmailData.email,
			subject: 'You have been invited to n8n',
			body: template(inviteEmailData),
		});

		// If mailer does not exist it means mail has been disabled.
		// No error, just say no email was sent.
		return result ?? { emailSent: false };
	}

	async passwordReset(passwordResetData: PasswordResetData): Promise<SendEmailResult> {
		if (!this.mailer) return { emailSent: false };

		const template = await this.getTemplate('passwordReset', 'passwordReset.html');
		const result = await this.mailer.sendMail({
			emailRecipients: passwordResetData.email,
			subject: 'n8n password reset',
			body: template(passwordResetData),
		});

		// If mailer does not exist it means mail has been disabled.
		// No error, just say no email was sent.
		return result ?? { emailSent: false };
	}

	async notifyWorkflowShared({
		sharer,
		newShareeIds,
		workflow,
	}: {
		sharer: User;
		newShareeIds: string[];
		workflow: WorkflowEntity;
	}): Promise<SendEmailResult> {
		if (!this.mailer) return { emailSent: false };

		const recipients = await this.userRepository.getEmailsByIds(newShareeIds);

		if (recipients.length === 0) return { emailSent: false };

		const emailRecipients = recipients.map(({ email }) => email);

		const populateTemplate = await this.getTemplate('workflowShared', 'workflowShared.html');

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

			void Container.get(InternalHooks).onUserTransactionalEmail({
				user_id: sharer.id,
				message_type: 'Workflow shared',
				public_api: false,
			});

			return result;
		} catch (e) {
			void Container.get(InternalHooks).onEmailFailed({
				user: sharer,
				message_type: 'Workflow shared',
				public_api: false,
			});
			Container.get(EventRelay).emit('email-failed', {
				user: sharer,
				messageType: 'Workflow shared',
			});

			const error = toError(e);

			throw new InternalServerError(`Please contact your administrator: ${error.message}`);
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

		const populateTemplate = await this.getTemplate('credentialsShared', 'credentialsShared.html');

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

			void Container.get(InternalHooks).onUserTransactionalEmail({
				user_id: sharer.id,
				message_type: 'Credentials shared',
				public_api: false,
			});

			return result;
		} catch (e) {
			void Container.get(InternalHooks).onEmailFailed({
				user: sharer,
				message_type: 'Credentials shared',
				public_api: false,
			});
			Container.get(EventRelay).emit('email-failed', {
				user: sharer,
				messageType: 'Credentials shared',
			});

			const error = toError(e);

			throw new InternalServerError(`Please contact your administrator: ${error.message}`);
		}
	}

	async getTemplate(
		templateName: TemplateName,
		defaultFilename = `${templateName}.html`,
	): Promise<Template> {
		let template = this.templatesCache[templateName];
		if (!template) {
			const templateOverride = this.templateOverrides[templateName];
			const templatePath =
				templateOverride && existsSync(templateOverride)
					? templateOverride
					: pathJoin(__dirname, `templates/${defaultFilename}`);
			const markup = await readFile(templatePath, 'utf-8');
			template = Handlebars.compile(markup);
			this.templatesCache[templateName] = template;
		}
		return template;
	}
}
