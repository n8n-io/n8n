import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import Handlebars from 'handlebars';
import { join as pathJoin } from 'path';
import { Container, Service } from 'typedi';
import config from '@/config';
import type { InviteEmailData, PasswordResetData, SendEmailResult } from './Interfaces';
import { NodeMailer } from './NodeMailer';
import { ApplicationError } from 'n8n-workflow';

type Template = HandlebarsTemplateDelegate<unknown>;
type TemplateName = 'invite' | 'passwordReset';

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

	constructor() {
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
}
