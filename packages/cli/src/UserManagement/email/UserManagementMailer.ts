import { readFileSync } from 'fs';
import { join as pathJoin } from 'path';
import config = require('../../../config');
import {
	InstanceSetupData,
	SendEmailResult,
	UserManagementMailerImplementation,
} from './Interfaces';
import { NodeMailer } from './NodeMailer';

export class UserManagementMailer {
	private mailer: UserManagementMailerImplementation | undefined;

	constructor() {
		// Other implementations can be used in the future.
		if (config.get('userManagement.emails.mode') === 'smtp') {
			this.mailer = new NodeMailer();
		}
	}

	async sendInstanceSetupEmail(instanceSetupData: InstanceSetupData): Promise<SendEmailResult> {
		let template = readFileSync(pathJoin(__dirname, 'templates/instanceSetup.html'), {
			encoding: 'utf-8',
		});
		template = template.replace(/\{\{\s*firstName\s*\}\}/, instanceSetupData.firstName ?? '');
		template = template.replace(/\{\{\s*lastName\s*\}\}/, instanceSetupData.lastName ?? '');
		template = template.replace(/\{\{\s*email\s*\}\}/, instanceSetupData.email);

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const result = await this.mailer?.sendMail({
			emailRecipients: instanceSetupData.email,
			subject: 'Your n8n instance is up and running!',
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
