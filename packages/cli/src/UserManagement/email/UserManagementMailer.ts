/* eslint-disable import/no-cycle */
import { existsSync, readFileSync } from 'fs';
import { IDataObject } from 'n8n-workflow';
import { join as pathJoin } from 'path';
import { GenericHelpers } from '../..';
import config = require('../../../config');
import {
	InviteEmailData,
	PasswordResetData,
	SendEmailResult,
	UserManagementMailerImplementation,
} from './Interfaces';
import { NodeMailer } from './NodeMailer';

async function getTemplate(configKeyName: string, defaultFilename: string) {
	const templateOverride = (await GenericHelpers.getConfigValue(
		`userManagement.emails.templates.${configKeyName}`,
	)) as string;

	let template;
	if (templateOverride && existsSync(templateOverride)) {
		template = readFileSync(templateOverride, {
			encoding: 'utf-8',
		});
	} else {
		template = readFileSync(pathJoin(__dirname, `templates/${defaultFilename}`), {
			encoding: 'utf-8',
		});
	}
	return template;
}

function replaceStrings(template: string, data: IDataObject) {
	let output = template;
	const keys = Object.keys(data);
	keys.forEach((key) => {
		const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
		output = output.replace(regex, data[key] as string);
	});
	return output;
}

export class UserManagementMailer {
	private mailer: UserManagementMailerImplementation | undefined;

	constructor() {
		// Other implementations can be used in the future.
		if (config.get('userManagement.emails.mode') === 'smtp') {
			this.mailer = new NodeMailer();
		}
	}

	async verifyConnection(): Promise<void> {
		if (!this.mailer) return Promise.reject();

		return this.mailer.verifyConnection();
	}

	async invite(inviteEmailData: InviteEmailData): Promise<SendEmailResult> {
		let template = await getTemplate('invite', 'invite.html');
		template = replaceStrings(template, inviteEmailData);

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const result = await this.mailer?.sendMail({
			emailRecipients: inviteEmailData.email,
			subject: 'You have been invited to n8n',
			body: template,
		});

		// If mailer does not exist it means mail has been disabled.
		return result ?? { success: true };
	}

	async passwordReset(passwordResetData: PasswordResetData): Promise<SendEmailResult> {
		let template = await getTemplate('passwordReset', 'passwordReset.html');
		template = replaceStrings(template, passwordResetData);

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const result = await this.mailer?.sendMail({
			emailRecipients: passwordResetData.email,
			subject: 'n8n password reset',
			body: template,
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
