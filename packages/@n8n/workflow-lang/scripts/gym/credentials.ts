/**
 * n8n credentials from a gym tenant, and the credentials document of spec
 * section 7 for the compiled run.
 *
 * The tenant document has `n8n_credentials` (n8n credential data by type)
 * for the API-key types. An OAuth2 type comes from
 * `POST /_sim/v1/tenants/<t>/credentials` with the credential id whose
 * `n8n_type` is the type: the gym then adds `oauthTokenData` with an access
 * token, as a connected n8n credential has.
 */
import type { CredentialsFile } from '../../src/credentials/build.ts';
import { buildCredentialsFile } from '../../src/credentials/build.ts';
import type { CredentialTypeRegistry } from '../../src/credentials/types.ts';
import { loadCredentialTypes, registryOf } from '../../src/credentials/types.ts';
import type { GymAdmin } from './gym-admin.ts';
import type { JsonRecord } from './sample.ts';
import { isRecord } from './sample.ts';

export type CredentialData = Record<string, unknown>;

/** Gets the data of each credential type from the tenant. Types the gym cannot give are in `missing`. */
export async function gymCredentials(
	gym: GymAdmin,
	tenant: string,
	tenantDoc: JsonRecord,
	services: string[],
	types: string[],
): Promise<{ byType: Record<string, CredentialData>; missing: string[] }> {
	const byType: Record<string, CredentialData> = {};
	const missing: string[] = [];
	const ready = isRecord(tenantDoc.n8n_credentials) ? tenantDoc.n8n_credentials : {};
	for (const type of new Set(types)) {
		const own = ready[type];
		// A body with only the OAuth client is not connected: it needs a token.
		if (isRecord(own) && !(/OAuth2/i.test(type) && !isRecord(own.oauthTokenData))) {
			byType[type] = { ...own };
			continue;
		}
		let found = false;
		for (const service of services) {
			const info = (await gym.credentialInfo(service)).find((c) => c.n8nType === type);
			if (!info) continue;
			const out = await gym.issue(tenant, service, info.id);
			const cred = isRecord(out.credential) ? out.credential : undefined;
			if (cred && isRecord(cred.data)) {
				byType[type] = { ...cred.data };
				found = true;
				break;
			}
		}
		// An OAuth2 type that only has its client in `n8n_credentials` (the Google product types):
		// the service's OAuth credential gives the token of the same identity.
		if (!found && isRecord(own) && /OAuth2/i.test(type)) {
			for (const service of services) {
				const info = (await gym.credentialInfo(service)).find((c) => /oauth/i.test(c.id));
				if (!info) continue;
				const out = await gym.issue(tenant, service, info.id);
				const cred = isRecord(out.credential) ? out.credential : undefined;
				const data = cred && isRecord(cred.data) ? cred.data : undefined;
				if (data && isRecord(data.oauthTokenData) && data.clientId === own.clientId) {
					byType[type] = { ...own, oauthTokenData: data.oauthTokenData };
					found = true;
					break;
				}
			}
		}
		if (!found) missing.push(type);
	}
	return { byType, missing };
}

let registry: CredentialTypeRegistry | undefined;

export function credentialRegistry(): CredentialTypeRegistry {
	registry ??= registryOf(loadCredentialTypes().types);
	return registry;
}

/**
 * The section 7 document: each slot of the converted workflow gets the data
 * of its credential type, built with `buildCredentialsFile`.
 */
export function credentialsDocument(
	slots: Record<string, { type: string }>,
	byType: Record<string, CredentialData>,
): { file: CredentialsFile; missing: string[] } {
	const file: CredentialsFile = {};
	const missing: string[] = [];
	for (const [slot, { type }] of Object.entries(slots)) {
		const data = byType[type];
		if (!data) {
			missing.push(`${slot} (${type})`);
			continue;
		}
		const built = buildCredentialsFile({
			exported: [{ id: slot, name: slot, type, data }],
			slots: [{ slot, type }],
			mappings: new Map([[slot, slot]]),
			registry: credentialRegistry(),
		});
		Object.assign(file, built.file);
	}
	return { file, missing };
}
