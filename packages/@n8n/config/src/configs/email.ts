import { Config, Env, Nested } from '../decorators';

@Config
export class SmtpAuth {
	/** SMTP login username */
	@Env('N8N_SMTP_USER')
	readonly user: string = '';

	/** SMTP login password */
	@Env('N8N_SMTP_PASS')
	readonly pass: string = '';

	/** SMTP OAuth Service Client */
	@Env('N8N_SMTP_OAUTH_SERVICE_CLIENT')
	readonly serviceClient: string = '';

	/** SMTP OAuth Private Key */
	@Env('N8N_SMTP_OAUTH_PRIVATE_KEY')
	readonly privateKey: string = '';
}

@Config
export class SmtpConfig {
	/** SMTP server host */
	@Env('N8N_SMTP_HOST')
	readonly host: string = '';

	/** SMTP server port */
	@Env('N8N_SMTP_PORT')
	readonly port: number = 465;

	/** Whether or not to use SSL for SMTP */
	@Env('N8N_SMTP_SSL')
	readonly secure: boolean = true;

	/** Whether or not to use STARTTLS for SMTP when SSL is disabled */
	@Env('N8N_SMTP_STARTTLS')
	readonly startTLS: boolean = true;

	/** How to display sender name */
	@Env('N8N_SMTP_SENDER')
	readonly sender: string = '';

	@Nested
	readonly auth: SmtpAuth;
}

@Config
export class TemplateConfig {
	/** Overrides default HTML template for inviting new people (use full path) */
	@Env('N8N_UM_EMAIL_TEMPLATES_INVITE')
	readonly invite: string = '';

	/** Overrides default HTML template for resetting password (use full path) */
	@Env('N8N_UM_EMAIL_TEMPLATES_PWRESET')
	readonly passwordReset: string = '';

	/** Overrides default HTML template for notifying that a workflow was shared (use full path) */
	@Env('N8N_UM_EMAIL_TEMPLATES_WORKFLOW_SHARED')
	readonly workflowShared: string = '';

	/** Overrides default HTML template for notifying that credentials were shared (use full path) */
	@Env('N8N_UM_EMAIL_TEMPLATES_CREDENTIALS_SHARED')
	readonly credentialsShared: string = '';
}

@Config
export class EmailConfig {
	/** How to send emails */
	@Env('N8N_EMAIL_MODE')
	readonly mode: '' | 'smtp' = 'smtp';

	@Nested
	readonly smtp: SmtpConfig;

	@Nested
	readonly template: TemplateConfig;
}
