/**
 * Refreshes the OAuth2 access tokens of a credentials document (spec
 * section 7) with their refresh tokens. `wfrt` does not refresh OAuth2 tokens
 * (spec 7, limits of the PoC), so an engine that hands it a stored token that
 * has expired gets 401 from library nodes. The engine test adapter runs this
 * before each run, as n8n would have to before it sends the document.
 *
 *   node scripts/gym/oauth-refresh.ts <credentials.json>
 *
 * It rewrites the file in place. A credential whose refresh fails keeps its
 * token. Run it with the gym's resolve.cjs and CA, so token URLs reach the gym.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { isRecord } from './sample.ts';

async function refresh(data: Record<string, unknown>): Promise<string> {
	const token = isRecord(data.oauthTokenData) ? data.oauthTokenData : undefined;
	const url = data.accessTokenUrl;
	if (!token || typeof token.refresh_token !== 'string' || typeof url !== 'string') return 'skip';
	const form = new URLSearchParams({
		grant_type: 'refresh_token',
		refresh_token: token.refresh_token,
	});
	const headers: Record<string, string> = {
		'content-type': 'application/x-www-form-urlencoded',
		accept: 'application/json',
	};
	const id = typeof data.clientId === 'string' ? data.clientId : '';
	const secret = typeof data.clientSecret === 'string' ? data.clientSecret : '';
	if (data.authentication === 'header') {
		headers.authorization = `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`;
	} else {
		form.set('client_id', id);
		form.set('client_secret', secret);
	}
	const res = await fetch(url, { method: 'POST', headers, body: form.toString() });
	const body: unknown = await res.json().catch(() => undefined);
	if (!res.ok || !isRecord(body) || typeof body.access_token !== 'string')
		return `failed ${res.status}`;
	data.oauthTokenData = { ...token, ...body };
	return 'ok';
}

async function main() {
	const file = process.argv[2];
	const doc: unknown = JSON.parse(readFileSync(file, 'utf8'));
	if (!isRecord(doc)) return;
	const report: Record<string, string> = {};
	for (const [slot, entry] of Object.entries(doc)) {
		if (!isRecord(entry) || !isRecord(entry.data)) continue;
		try {
			report[slot] = await refresh(entry.data);
		} catch (e) {
			report[slot] = `failed ${e instanceof Error ? e.message : String(e)}`;
		}
	}
	writeFileSync(file, JSON.stringify(doc), { mode: 0o600 });
	process.stdout.write(`${JSON.stringify(report)}\n`);
}

void main().catch((e: unknown) => {
	process.stderr.write(`oauth-refresh: ${e instanceof Error ? e.message : String(e)}\n`);
	process.exit(2);
});
