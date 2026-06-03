// Local self-signed OIDC issuer for the ENT-28 POC. No external IdP needed.
// Generates an RS256 key pair, serves OIDC discovery + JWKS over HTTP, and
// mints short-lived JWTs. Point the n8n "OAuth2/OIDC Bearer Token" credential's
// Issuer URL at this server.
//
// Run:  node scripts/serve-issuer.mjs   (or: pnpm serve-issuer)
// Env:  ISSUER_PORT (default 9000), ISSUER_URL, AUDIENCE (default "n8n")
import http from 'node:http';

import { SignJWT, exportJWK, generateKeyPair } from 'jose';

const PORT = process.env.ISSUER_PORT ? Number(process.env.ISSUER_PORT) : 9000;
const ISSUER = process.env.ISSUER_URL ?? `http://localhost:${PORT}`;
const AUDIENCE = process.env.AUDIENCE ?? 'n8n';
const KID = 'local-key-1';

const { publicKey, privateKey } = await generateKeyPair('RS256');
const publicJwk = await exportJWK(publicKey);
publicJwk.kid = KID;
publicJwk.alg = 'RS256';
publicJwk.use = 'sig';
const jwks = { keys: [publicJwk] };

async function mint({
	sub = 'local-user',
	groups = ['admin'],
	scope = 'wf-execute',
	expiresInSec = 300,
	aud = AUDIENCE,
} = {}) {
	const now = Math.floor(Date.now() / 1000);
	return await new SignJWT({ groups, scope })
		.setProtectedHeader({ alg: 'RS256', kid: KID })
		.setSubject(sub)
		.setIssuedAt(now)
		.setIssuer(ISSUER)
		.setAudience(aud)
		.setExpirationTime(now + expiresInSec)
		.sign(privateKey);
}

const json = (res, status, body) => {
	res.writeHead(status, { 'content-type': 'application/json' });
	res.end(JSON.stringify(body));
};

const server = http.createServer(async (req, res) => {
	const url = new URL(req.url, ISSUER);
	if (url.pathname === '/.well-known/openid-configuration') {
		return json(res, 200, {
			issuer: ISSUER,
			jwks_uri: `${ISSUER}/jwks`,
			token_endpoint: `${ISSUER}/token`,
		});
	}
	if (url.pathname === '/jwks') {
		return json(res, 200, jwks);
	}
	if (url.pathname === '/token') {
		const groups = url.searchParams.get('groups');
		const exp = url.searchParams.get('exp');
		const token = await mint({
			sub: url.searchParams.get('sub') ?? undefined,
			scope: url.searchParams.get('scope') ?? undefined,
			groups: groups ? groups.split(',') : undefined,
			expiresInSec: exp ? Number(exp) : undefined,
			aud: url.searchParams.get('aud') ?? undefined,
		});
		return json(res, 200, { access_token: token, token_type: 'Bearer' });
	}
	res.writeHead(404);
	res.end('not found');
});

server.listen(PORT, async () => {
	const sample = await mint();
	console.log(`Local OIDC issuer listening on ${ISSUER}`);
	console.log(`  discovery: ${ISSUER}/.well-known/openid-configuration`);
	console.log(`  jwks:      ${ISSUER}/jwks`);
	console.log(`  mint:      ${ISSUER}/token?sub=alice&groups=admin&scope=wf-execute&exp=300`);
	console.log('');
	console.log('n8n credential fields:');
	console.log(`  Validation Method: JWT (JWKS)`);
	console.log(`  Issuer URL:        ${ISSUER}`);
	console.log(`  Audience:          ${AUDIENCE}`);
	console.log('');
	console.log(`Sample token (valid 5 min):\n${sample}`);
});
