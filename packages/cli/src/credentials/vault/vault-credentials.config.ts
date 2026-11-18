import { Config, Env } from '@n8n/config';

@Config
export class VaultCredentialsConfig {
	/**
	 * The URL of the credential broker that gives n8n access to credentials stored in a vault, for
	 * example `http://broker.internal:8787`. When unset, credentials that point to a vault can't be
	 * used and workflows that run them fail with an error.
	 */
	@Env('N8N_VAULT_BROKER_URL')
	brokerUrl: string = '';

	/**
	 * The URL of the vault that n8n reads single-use tokens from, for example
	 * `http://vault.internal:8200`. Set it together with the broker URL.
	 */
	@Env('N8N_VAULT_URL')
	vaultUrl: string = '';

	/**
	 * The URL that your browser uses to reach the credential broker, for example
	 * `https://vault-entry.example.com`. The secure entry form for secrets loads from it. When unset,
	 * n8n uses the broker URL.
	 */
	@Env('N8N_VAULT_BROKER_PUBLIC_URL')
	brokerPublicUrl: string = '';

	/**
	 * The key that lets n8n ask the broker for a secure entry form for one credential. It can't read
	 * secrets. When unset, people can't enter secrets in the editor and credentials in a vault must
	 * be filled another way.
	 */
	@Env('N8N_VAULT_CAPTURE_KEY')
	captureKey: string = '';

	/**
	 * The time in milliseconds that n8n waits for the broker and the vault to answer before it
	 * stops the workflow run.
	 */
	@Env('N8N_VAULT_REQUEST_TIMEOUT')
	requestTimeout: number = 5000;
}
