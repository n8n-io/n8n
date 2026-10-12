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

export type EmailChangeConfirmationData = {
	email: string; // current (old) address — the recipient
	firstName: string;
	newEmail: string;
	confirmationUrl: string;
};

export type EmailChangeCompletedData = {
	email: string; // old address — the recipient
	firstName: string;
	newEmail: string;
};
