import { Config, Env, Nested } from '../decorators';

@Config
class WebAuthnConfig {
	/** Relying Party ID for WebAuthn. Auto-derived from instance URL if empty. */
	@Env('N8N_WEBAUTHN_RP_ID')
	rpId: string = '';

	/** Relying Party name shown during WebAuthn registration. */
	@Env('N8N_WEBAUTHN_RP_NAME')
	rpName: string = 'n8n';

	/** Expected origin for WebAuthn. Auto-derived from instance URL if empty. */
	@Env('N8N_WEBAUTHN_ORIGIN')
	origin: string = '';

	/** How long a WebAuthn challenge is valid (in ms). */
	@Env('N8N_WEBAUTHN_CHALLENGE_TTL_MS')
	challengeTtlMs: number = 300_000;
}

@Config
export class MfaConfig {
	/** Whether multi-factor authentication (MFA) is enabled for the instance. */
	@Env('N8N_MFA_ENABLED')
	enabled: boolean = true;

	@Nested
	webauthn: WebAuthnConfig;
}
