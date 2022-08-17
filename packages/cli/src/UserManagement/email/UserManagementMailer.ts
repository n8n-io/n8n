import Handlebars from 'handlebars';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join as pathJoin } from 'path';
// eslint-disable-next-line import/no-cycle
import { GenericHelpers } from '../..';
import * as config from '../../../config';
import {
	InviteEmailData,
	PasswordResetData,
	SendEmailResult,
	UserManagementMailerImplementation,
} from './Interfaces';
import { NodeMailer } from './NodeMailer';

type Template = HandlebarsTemplateDelegate<unknown>;
type TemplateName = 'invite' | 'passwordReset';

const templates: Partial<Record<TemplateName, Template>> = {};

async function getTemplate(
	templateName: TemplateName,
	defaultFilename = `${templateName}.html`,
): Promise<Template> {
	let template = templates[templateName];
	if (!template) {
		const templateOverride = (await GenericHelpers.getConfigValue(
			`userManagement.emails.templates.${templateName}`,
		)) as string;

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

export class UserManagementMailer {
	private mailer: UserManagementMailerImplementation | undefined;

	constructor() {
		// Other implementations can be used in the future.
		if (config.getEnv('userManagement.emails.mode') === 'smtp') {
			this.mailer = new NodeMailer();
		}
	}

	async verifyConnection(): Promise<void> {
		if (!this.mailer) return Promise.reject();

		return this.mailer.verifyConnection();
	}

	async invite(inviteEmailData: InviteEmailData): Promise<SendEmailResult> {
		if (!this.mailer) return Promise.reject();

		const template = await getTemplate('invite');
		const result = await this.mailer.sendMail({
			emailRecipients: inviteEmailData.email,
			subject: 'You have been invited to n8n',
			body: template(inviteEmailData),
		});

		// If mailer does not exist it means mail has been disabled.
		return result ?? { success: true };
	}

	async passwordReset(passwordResetData: PasswordResetData): Promise<SendEmailResult> {
		if (!this.mailer) return Promise.reject();

		const template = await getTemplate('passwordReset');
		const result = await this.mailer.sendMail({
			emailRecipients: passwordResetData.email,
			subject: 'n8n password reset',
			body: template(passwordResetData),
		});

		// If mailer does not exist it means mail has been disabled.
		return result ?? { success: true };
	}
}

let mailerInstance: UserManagementMailer | undefined;

export async function getInstance(): Promise<UserManagementMailer> {
	if (mailerInstance === undefined) {
		mailerInstance = new UserManagementMailer();
		await mailerInstance.verifyConnection();
	}
	return mailerInstance;
}
