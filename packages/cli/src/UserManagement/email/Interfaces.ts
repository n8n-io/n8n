export type InviteEmailData = {
	email: string;
	firstName?: string;
	lastName?: string;
	inviteAcceptUrl: string;
	domain: string;
};

export type PasswordResetData = {
	email: string;
	firstName?: string;
	lastName?: string;
	passwordResetUrl: string;
	domain: string;
};

export type SendEmailResult = {
	emailSent: boolean;
};

export type MailData = {
	body: string | Buffer;
	emailRecipients: string | string[];
	subject: string;
	textOnly?: string;
};
