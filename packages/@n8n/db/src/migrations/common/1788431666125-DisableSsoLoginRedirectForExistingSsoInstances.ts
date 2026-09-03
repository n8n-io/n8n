import type { IrreversibleMigration, MigrationContext } from '../migration-types';

const REDIRECT_LOGIN_TO_SSO_KEY = 'sso.redirectLoginToSso';
const AUTHENTICATION_METHOD_KEY = 'userManagement.authenticationMethod';

/**
 * Pins the "redirect login page to SSO" setting to disabled for instances that
 * already use SSO, so an update does not change their login behaviour. New
 * instances (and instances not using SSO) keep the code default (enabled), and
 * only turn the redirect on when an admin enables it.
 *
 * "Already uses SSO" means the active authentication method is SAML or OIDC —
 * the exact condition under which the login page would auto-redirect.
 */
export class DisableSsoLoginRedirectForExistingSsoInstances1788431666125
	implements IrreversibleMigration
{
	async up({ escape, runQuery, logger, migrationName }: MigrationContext) {
		const settings = escape.tableName('settings');
		const key = escape.columnName('key');
		const value = escape.columnName('value');
		const loadOnStartup = escape.columnName('loadOnStartup');

		type SettingRow = { value: string };

		// Do not override a value that is already set.
		const existing = await runQuery<SettingRow[]>(
			`SELECT ${value} AS value FROM ${settings} WHERE ${key} = :key`,
			{ key: REDIRECT_LOGIN_TO_SSO_KEY },
		);
		if (existing.length > 0) return;

		// Only pin the value for instances actively using SSO.
		const authMethod = await runQuery<SettingRow[]>(
			`SELECT ${value} AS value FROM ${settings} WHERE ${key} = :key`,
			{ key: AUTHENTICATION_METHOD_KEY },
		);
		const method = authMethod[0]?.value;
		if (method !== 'saml' && method !== 'oidc') return;

		await runQuery(
			`INSERT INTO ${settings} (${key}, ${value}, ${loadOnStartup}) VALUES (:key, 'false', true)`,
			{ key: REDIRECT_LOGIN_TO_SSO_KEY },
		);

		logger.info(
			`[${migrationName}] Disabled the SSO login redirect for this existing SSO instance`,
		);
	}
}
