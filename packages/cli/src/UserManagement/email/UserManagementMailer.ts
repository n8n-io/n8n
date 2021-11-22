import { existsSync, readFileSync } from 'fs';
import { IDataObject } from 'n8n-workflow';
import { join as pathJoin } from 'path';
import config = require('../../../config');
import {
	InstanceSetupData,
	InviteEmailData,
	PasswordResetData,
	SendEmailResult,
	UserManagementMailerImplementation,
} from './Interfaces';
import { NodeMailer } from './NodeMailer';

function getTemplate(configKeyName: string, defaultFilename: string) {
	const templateOverride = config.get(`userManagement.emails.templates.${configKeyName}`) as string;
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

	async instanceSetup(instanceSetupData: InstanceSetupData): Promise<SendEmailResult> {
		let template = getTemplate('instanceSetup', 'instanceSetup.html');
		template = replaceStrings(template, instanceSetupData);

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const result = await this.mailer?.sendMail({
			emailRecipients: instanceSetupData.email,
			subject: 'Your n8n instance is up and running!',
			body: template,
		});

		// If mailer does not exist it means mail has been disabled.
		return result ?? { success: true };
	}

	async invite(inviteEmailData: InviteEmailData): Promise<SendEmailResult> {
		let template = getTemplate('invite', 'invite.html');
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
		let template = getTemplate('passwordReset', 'passwordReset.html');
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

export function getInstance(): UserManagementMailer {
	if (mailerInstance === undefined) {
		mailerInstance = new UserManagementMailer();
	}
	return mailerInstance;
}
