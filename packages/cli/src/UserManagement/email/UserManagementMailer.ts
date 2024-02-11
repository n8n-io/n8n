import { Container, Service } from 'typedi';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import Handlebars from 'handlebars';
import { join as pathJoin } from 'path';
import { ApplicationError } from 'n8n-workflow';

import config from '@/config';
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

type Template = HandlebarsTemplateDelegate<unknown>;
type TemplateName = 'invite' | 'passwordReset' | 'workflowShared' | 'credentialsShared';

const templates: Partial<Record<TemplateName, Template>> = {};

async function getTemplate(
	templateName: TemplateName,
	defaultFilename = `${templateName}.html`,
): Promise<Template> {
	let template = templates[templateName];
	if (!template) {
		const templateOverride = config.getEnv(`userManagement.emails.templates.${templateName}`);

		let markup;
		if (templateOverride && existsSync(templateOverride)) {
			markup = await readFile(templateOverride, 'utf-8');
		} else {
			markup = await readFile(pathJoin(__dirname, `templates/${defaultFilename}`), 'utf-8');
		}
		template = Handlebars.compile(markup);
		templates[templateName] = template;
	}
	return template;
}

@Service()
export class UserManagementMailer {
	readonly isEmailSetUp: boolean;

	private mailer: NodeMailer | undefined;

	constructor(
		private readonly userRepository: UserRepository,
		private readonly logger: Logger,
		private readonly urlService: UrlService,
	) {
		this.isEmailSetUp =
			config.getEnv('userManagement.emails.mode') === 'smtp' &&
			config.getEnv('userManagement.emails.smtp.host') !== '';

		// Other implementations can be used in the future.
		if (this.isEmailSetUp) {
			this.mailer = Container.get(NodeMailer);
		}
	}

	async verifyConnection(): Promise<void> {
		if (!this.mailer) throw new ApplicationError('No mailer configured.');

		return await this.mailer.verifyConnection();
	}

	async invite(inviteEmailData: InviteEmailData): Promise<SendEmailResult> {
		const template = await getTemplate('invite');
		const result = await this.mailer?.sendMail({
			emailRecipients: inviteEmailData.email,
			subject: 'You have been invited to n8n',
			body: template(inviteEmailData),
		});

		// If mailer does not exist it means mail has been disabled.
		// No error, just say no email was sent.
		return result ?? { emailSent: false };
	}

	async passwordReset(passwordResetData: PasswordResetData): Promise<SendEmailResult> {
		const template = await getTemplate('passwordReset', 'passwordReset.html');
		const result = await this.mailer?.sendMail({
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
	}) {
		if (!this.mailer) return;

		const recipients = await this.userRepository.getEmailsByIds(newShareeIds);

		if (recipients.length === 0) return;

		const emailRecipients = recipients.map(({ email }) => email);

		const populateTemplate = await getTemplate('workflowShared', 'workflowShared.html');

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
	}) {
		if (!this.mailer) return;

		const recipients = await this.userRepository.getEmailsByIds(newShareeIds);

		if (recipients.length === 0) return;

		const emailRecipients = recipients.map(({ email }) => email);

		const populateTemplate = await getTemplate('credentialsShared', 'credentialsShared.html');

		const baseUrl = this.urlService.getInstanceBaseUrl();

		try {
			const result = await this.mailer.sendMail({
				emailRecipients,
				subject: `${sharer.firstName} has shared an n8n credential with you`,
				body: populateTemplate({ credentialsName, credentialsListUrl: `${baseUrl}/credentials` }),
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

			const error = toError(e);

			throw new InternalServerError(`Please contact your administrator: ${error.message}`);
		}
	}
}
