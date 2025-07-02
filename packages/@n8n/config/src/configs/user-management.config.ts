import { z } from 'zod';

import { Config, Env, Nested } from '../decorators';

@Config
class SmtpAuth {
	/** SMTP login username */
	@Env('N8N_SMTP_USER')
	user: string = '';

	/** SMTP login password */
	@Env('N8N_SMTP_PASS')
	pass: string = '';

	/** SMTP OAuth Service Client */
	@Env('N8N_SMTP_OAUTH_SERVICE_CLIENT')
	serviceClient: string = '';

	/** SMTP OAuth Private Key */
	@Env('N8N_SMTP_OAUTH_PRIVATE_KEY')
	privateKey: string = '';
}

@Config
class SmtpConfig {
	/** SMTP server host */
	@Env('N8N_SMTP_HOST')
	host: string = '';

	/** SMTP server port */
	@Env('N8N_SMTP_PORT')
	port: number = 465;

	/** Whether to use SSL for SMTP */
	@Env('N8N_SMTP_SSL')
	secure: boolean = true;

	/** Whether to use STARTTLS for SMTP when SSL is disabled */
	@Env('N8N_SMTP_STARTTLS')
	startTLS: boolean = true;

	/** How to display sender name */
	@Env('N8N_SMTP_SENDER')
	sender: string = '';

	@Nested
	auth: SmtpAuth;
}

@Config
export class TemplateConfig {
	/** Overrides default HTML template for inviting new people (use full path) */
	@Env('N8N_UM_EMAIL_TEMPLATES_INVITE')
	'user-invited': string = '';

	/** Overrides default HTML template for resetting password (use full path) */
	@Env('N8N_UM_EMAIL_TEMPLATES_PWRESET')
	'password-reset-requested': string = '';

	/** Overrides default HTML template for notifying that a workflow was shared (use full path) */
	@Env('N8N_UM_EMAIL_TEMPLATES_WORKFLOW_SHARED')
	'workflow-shared': string = '';

	/** Overrides default HTML template for notifying that credentials were shared (use full path) */
	@Env('N8N_UM_EMAIL_TEMPLATES_CREDENTIALS_SHARED')
	'credentials-shared': string = '';

	/** Overrides default HTML template for notifying that credentials were shared (use full path) */
	@Env('N8N_UM_EMAIL_TEMPLATES_PROJECT_SHARED')
	'project-shared': string = '';
}

const emailModeSchema = z.enum(['', 'smtp']);
type EmailMode = z.infer<typeof emailModeSchema>;

@Config
class EmailConfig {
	/** How to send emails */
	@Env('N8N_EMAIL_MODE', emailModeSchema)
	mode: EmailMode = 'smtp';

	@Nested
	smtp: SmtpConfig;

	@Nested
	template: TemplateConfig;
}

@Config
export class UserManagementConfig {
	@Nested
	emails: EmailConfig;
}
