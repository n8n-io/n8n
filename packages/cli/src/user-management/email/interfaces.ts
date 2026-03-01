export type InviteEmailData = {
	email: string;
	inviteAcceptUrl: string;
};

export type PasswordResetData = {
	email: string;
	firstName: string;
	passwordResetUrl: string;
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
