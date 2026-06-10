export type InviteEmailData = {
	email: string;
	inviteAcceptUrl: string;
};

export type PasswordResetData = {
	email: string;
	firstName: string;
	passwordResetUrl: string;
};

export type ApiKeyRevokedEmailData = {
	email: string;
	firstName: string;
	label: string;
	suffix: string;
	revokedBy: string;
	revokedAt: string;
	createApiKeyUrl: string;
};

export type SendEmailResult = {
	emailSent: boolean;
	errors?: string[];
};

export type MailData = {
	body: string | Buffer;
	emailRecipients: string | string[];
	subject: string;
	textOnly?: string;
};
