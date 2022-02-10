export type SmtpTestAccount = {
	user: string;
	pass: string;
	smtp: {
		host: string;
		port: number;
		secure: boolean;
	};
};
