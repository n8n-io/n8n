export interface UserManagementMailerImplementation {
	sendMail: (mailData: MailData) => Promise<SendEmailResult>;
}

export type InstanceSetupData = {
	email: string;
	firstName?: string;
	lastName?: string;
};

export type InviteEmailData = {
	email: string;
	firstName?: string;
	lastName?: string;
	inviteAcceptUrl: string;
};

export type PasswordResetData = {
	email: string;
	firstName?: string;
	lastName?: string;
	passwordResetUrl: string;
};

export type SendEmailResult = {
	success: boolean;
	error?: Error;
};

export type MailData = {
	body: string | Buffer;
	emailRecipients: string | string[];
	subject: string;
	textOnly?: string;
};
