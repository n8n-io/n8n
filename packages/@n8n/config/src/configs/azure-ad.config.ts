import { Config, Env } from '../decorators';

@Config
export class AzureAdConfig {
	/** Whether to enable Azure AD SSO. */
	@Env('N8N_AZURE_AD_LOGIN_ENABLED')
	loginEnabled: boolean = false;

	/** Azure AD tenant ID */
	@Env('N8N_AZURE_AD_TENANT_ID')
	tenantId: string = '';

	/** Azure AD client ID (Application ID) */
	@Env('N8N_AZURE_AD_CLIENT_ID')
	clientId: string = '';

	/** Azure AD client secret */
	@Env('N8N_AZURE_AD_CLIENT_SECRET')
	clientSecret: string = '';

	/** Azure AD redirect URI for callback */
	@Env('N8N_AZURE_AD_REDIRECT_URI')
	redirectUri: string = '';

	/** Azure AD login label */
	@Env('N8N_AZURE_AD_LOGIN_LABEL')
	loginLabel: string = 'Sign in with Microsoft';

	/** Azure AD authority URL (defaults to common) */
	@Env('N8N_AZURE_AD_AUTHORITY')
	authority: string = 'https://login.microsoftonline.com/common';

	/** Whether to use the tenant-specific authority instead of common */
	@Env('N8N_AZURE_AD_USE_TENANT_AUTHORITY')
	useTenantAuthority: boolean = false;

	/** Scopes to request from Azure AD */
	@Env('N8N_AZURE_AD_SCOPES')
	scopes: string = 'openid profile email User.Read';

	/** Whether to auto-create users on first login */
	@Env('N8N_AZURE_AD_AUTO_CREATE_USER')
	autoCreateUser: boolean = true;

	/** Default role for auto-created users */
	@Env('N8N_AZURE_AD_DEFAULT_ROLE')
	defaultRole: string = 'member';

	/** Whether to sync user profile from Azure AD on every login */
	@Env('N8N_AZURE_AD_SYNC_PROFILE')
	syncProfile: boolean = true;

	/** Whether to force Azure AD authentication (disable email/password login) */
	@Env('N8N_AZURE_AD_FORCE_AUTHENTICATION')
	forceAuthentication: boolean = false;
}
