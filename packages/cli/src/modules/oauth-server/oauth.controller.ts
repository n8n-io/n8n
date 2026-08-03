import { authorizationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/authorize.js';
import { clientRegistrationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/register.js';
import { revocationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/revoke.js';
import { tokenHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/token.js';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import {
	createIpRateLimit,
	Get,
	Options,
	RootLevelController,
	StaticRouterMetadata,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response, Request, RequestHandler, Router } from 'express';

import { isWebhookOAuth2Enabled } from '@/constants/oauth2-triggers';
import type { ProtectedResource } from '@/services/protected-resource.registry';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';

import { OAuthServerConfig } from './oauth-server.config';
import { OAuthServerService } from './oauth-server.service';
import { buildOAuthClientLimitReachedMessage } from './oauth.errors';
import { OAuthHelpers } from './oauth.helpers';

const oauthServerService = Container.get(OAuthServerService);
const globalConfig = Container.get(GlobalConfig);
const oauthServerConfig = Container.get(OAuthServerConfig);
const logger = Container.get(Logger);
const urlService = Container.get(UrlService);

/**
 * Pre-check guard for the unauthenticated DCR endpoint. Short-circuits with
 * a structured `server_error` response when the instance is at the
 * registered-client cap. Returns HTTP 503 because limit exhaustion is a
 * temporary capacity condition, not an internal failure.
 *
 * The post-insert rollback in `enforceClientLimit` throws
 * `OAuthClientLimitReachedError` (a `ServerError` subclass) so the SDK
 * surfaces the same body shape on the rare race path; the SDK's register
 * handler hardcodes 500 for `ServerError`, so that path returns 500 with
 * an identical body.
 */
const oauthClientLimitGuard: RequestHandler = async (_req, res, next) => {
	if (await oauthServerService.isClientLimitReached()) {
		const limit = globalConfig.endpoints.mcpMaxRegisteredClients;
		logger.warn('OAuth client registration rejected: instance limit reached (pre-check)', {
			limit,
		});
		res.status(503).json({
			error: 'server_error',
			error_description: buildOAuthClientLimitReachedMessage(limit),
		});
		return;
	}
	next();
};

/**
 * The SDK's authorization handler redirects request-validation errors (e.g.
 * missing `code_challenge`) back to the client without the RFC 9207 `iss`
 * parameter, while our metadata advertises
 * `authorization_response_iss_parameter_supported`. Wrap `res.location`
 * (which `res.redirect` sets its target through) so every absolute-URL
 * redirect from the authorize route carries `iss` matching the advertised
 * issuer. Internal relative redirects (consent screen) pass through
 * untouched. Remove once `@modelcontextprotocol/sdk` ships
 * `authorizationHandler({ issuerUrl })` (on upstream main, unreleased as of
 * 1.29.0) and the catalog version is bumped past it.
 */
const rfc9207IssuerParam: RequestHandler = (_req, res, next) => {
	const originalLocation = res.location.bind(res);
	res.location = (url: string) =>
		originalLocation(OAuthHelpers.setIssuerParam(url, urlService.getInstanceBaseUrl()));
	next();
};

// Built once and mounted under both the legacy `/mcp-oauth/*` paths (existing
// DCR clients hold them in their stored discovery metadata) and the neutral
// `/oauth/*` paths that future, non-MCP protected resources will advertise.
const registerRouter = clientRegistrationHandler({
	clientsStore: oauthServerService.clientsStore,
}) as Router;
const authorizeRouter = authorizationHandler({ provider: oauthServerService }) as Router;
const tokenRouter = tokenHandler({ provider: oauthServerService }) as Router;
const revokeRouter = revocationHandler({ provider: oauthServerService }) as Router;

const sharedEndpointRouters = (basePath: '/mcp-oauth' | '/oauth'): StaticRouterMetadata[] => [
	{
		path: `${basePath}/register`,
		router: registerRouter,
		skipAuth: true,
		middlewares: [oauthClientLimitGuard],
		ipRateLimit: createIpRateLimit(
			oauthServerConfig.rateLimitRegister,
			5 * Time.minutes.toMilliseconds,
		),
	},
	{
		path: `${basePath}/authorize`,
		router: authorizeRouter,
		skipAuth: true,
		middlewares: [rfc9207IssuerParam],
		ipRateLimit: createIpRateLimit(
			oauthServerConfig.rateLimitAuthorize,
			5 * Time.minutes.toMilliseconds,
		),
	},
	{
		path: `${basePath}/token`,
		router: tokenRouter,
		skipAuth: true,
		ipRateLimit: createIpRateLimit(
			oauthServerConfig.rateLimitToken,
			5 * Time.minutes.toMilliseconds,
		),
	},
	{
		path: `${basePath}/revoke`,
		router: revokeRouter,
		skipAuth: true,
		ipRateLimit: createIpRateLimit(
			oauthServerConfig.rateLimitRevoke,
			5 * Time.minutes.toMilliseconds,
		),
	},
];

const wellKnownIpRateLimit = createIpRateLimit(
	oauthServerConfig.rateLimitWellKnown,
	5 * Time.minutes.toMilliseconds,
);

@RootLevelController('/')
export class OAuthController {
	constructor(
		private readonly urlService: UrlService,
		private readonly resourceRegistry: ProtectedResourceRegistry,
	) {}

	// Add CORS headers for OAuth discovery endpoints
	private setCorsHeaders(res: Response) {
		// Allow requests from any origin for OAuth discovery
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
		res.header('Access-Control-Allow-Headers', 'Content-Type');
	}

	static routers: StaticRouterMetadata[] = [
		...sharedEndpointRouters('/mcp-oauth'),
		...sharedEndpointRouters('/oauth'),
	];

	@Options('/.well-known/oauth-authorization-server', {
		skipAuth: true,
		usesTemplates: true,
		ipRateLimit: wellKnownIpRateLimit,
	})
	metadataOptions(_req: Request, res: Response) {
		this.setCorsHeaders(res);
		res.status(204).end();
	}

	/**
	 * Single RFC 8414 authorization-server metadata document, shared by all
	 * protected resources: one issuer (the instance origin), one set of
	 * endpoints, one signing key.
	 *
	 * Keeps advertising the legacy `/mcp-oauth/*` endpoint paths — clients that
	 * registered via DCR persist these URLs, so changing them would strand
	 * every already-connected client.
	 */
	@Get('/.well-known/oauth-authorization-server', {
		skipAuth: true,
		usesTemplates: true,
		ipRateLimit: wellKnownIpRateLimit,
	})
	metadata(_req: Request, res: Response) {
		this.setCorsHeaders(res);

		const baseUrl = this.urlService.getInstanceBaseUrl();
		const allScopes = this.resourceRegistry.getAllScopes();
		const metadata: Record<string, unknown> = {
			issuer: baseUrl,
			authorization_endpoint: `${baseUrl}/mcp-oauth/authorize`,
			token_endpoint: `${baseUrl}/mcp-oauth/token`,
			registration_endpoint: `${baseUrl}/mcp-oauth/register`,
			revocation_endpoint: `${baseUrl}/mcp-oauth/revoke`,
			response_types_supported: ['code'],
			grant_types_supported: ['authorization_code', 'refresh_token'],
			token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
			code_challenge_methods_supported: ['S256'],
			// RFC 9207: we include the `iss` parameter on authorization responses
			authorization_response_iss_parameter_supported: true,
		};

		if (allScopes.length > 0) {
			metadata.scopes_supported = allScopes;
		}

		res.json(metadata);
	}

	@Options('/.well-known/oauth-protected-resource/*resourcePath', {
		skipAuth: true,
		usesTemplates: true,
		ipRateLimit: wellKnownIpRateLimit,
	})
	protectedResourceMetadataOptions(_req: Request, res: Response) {
		this.setCorsHeaders(res);
		res.status(204).end();
	}

	/**
	 * RFC 9728 protected-resource metadata, resolved dynamically through the
	 * registry so any registered resource path is served by one route — the
	 * static instance MCP resource today, per-workflow resources later.
	 */
	@Get('/.well-known/oauth-protected-resource/*resourcePath', {
		skipAuth: true,
		usesTemplates: true,
		ipRateLimit: wellKnownIpRateLimit,
	})
	async protectedResourceMetadata(req: Request, res: Response) {
		this.setCorsHeaders(res);

		const resourcePath =
			'/' +
			(Array.isArray(req.params.resourcePath)
				? req.params.resourcePath.join('/')
				: req.params.resourcePath); // Wildcard params are captured as arrays

		// The wildcard param drops the query, which some resources use as a selector
		// (e.g. a webhook trigger's `?method=`), so forward it for the registry to route.
		const queryStart = req.originalUrl?.indexOf('?') ?? -1;
		const search = queryStart === -1 ? '' : req.originalUrl.slice(queryStart);

		const resource = await this.resourceRegistry.getByResourcePath(resourcePath + search);
		if (!resource) {
			res.status(404).json({ message: 'Unknown protected resource' });
			return;
		}

		res.json(this.buildProtectedResourceMetadata(resource));
	}

	@Options('/.well-known/oauth-protected-resource', {
		skipAuth: true,
		usesTemplates: true,
		ipRateLimit: wellKnownIpRateLimit,
	})
	defaultProtectedResourceMetadataOptions(_req: Request, res: Response) {
		this.setCorsHeaders(res);
		res.status(204).end();
	}

	/**
	 * RFC 9728 protected-resource metadata for the bare `/.well-known/
	 * oauth-protected-resource` path (no resource-path suffix).
	 *
	 * Per RFC 9728 §3.1, a resource server whose resource identifier has no
	 * path component publishes its metadata at this exact well-known URI.
	 * We also serve it as a courtesy for clients that probe the origin-level
	 * document before (or instead of) the resource-scoped one advertised via
	 * `WWW-Authenticate: resource_metadata=...` — without this route, such a
	 * probe previously fell through to the SPA's catch-all handler, which
	 * answered with `200 text/html` instead of a clean `404`, breaking OAuth
	 * discovery for clients that don't special-case a non-JSON `200`.
	 *
	 * Resolves to this instance's default protected resource (today, always
	 * the single instance-wide MCP resource); returns 404 when no default is
	 * registered so the caller can fall back to the resource-scoped URL.
	 */
	@Get('/.well-known/oauth-protected-resource', {
		skipAuth: true,
		usesTemplates: true,
		ipRateLimit: wellKnownIpRateLimit,
	})
	defaultProtectedResourceMetadata(_req: Request, res: Response) {
		this.setCorsHeaders(res);

		const resource = this.resourceRegistry.getDefaultResource();
		if (!resource) {
			res.status(404).json({ message: 'Unknown protected resource' });
			return;
		}

		res.json(this.buildProtectedResourceMetadata(resource));
	}

	/**
	 * Dev-only, same-origin OAuth flow tester for `n8nOAuth2` webhook triggers.
	 * Lets a non-technical tester paste a webhook URL, run DCR + PKCE + consent
	 * entirely in the browser (no CORS, since the page is served by the instance
	 * itself and the user is already logged in), then see the minted token's
	 * audience and the webhook's response.
	 *
	 * Gated behind the same feature flag as the webhook OAuth resolver, so it is
	 * absent (404) unless `N8N_ENV_FEAT_WEBHOOK_PRIVATE_CREDENTIALS` is enabled —
	 * it must never be reachable on a production instance.
	 */
	@Get('/oauth/webhook-tester', { skipAuth: true })
	webhookTester(_req: Request, res: Response) {
		if (!isWebhookOAuth2Enabled()) {
			res.status(404).json({ message: 'Not found' });
			return;
		}
		res.setHeader(
			'Content-Security-Policy',
			"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'self'; form-action 'self'",
		);
		res.type('html').send(WEBHOOK_TESTER_HTML);
	}

	private buildProtectedResourceMetadata(resource: ProtectedResource): Record<string, unknown> {
		const baseUrl = this.urlService.getInstanceBaseUrl();
		const metadata: Record<string, unknown> = {
			resource: resource.getResourceUrl(),
			bearer_methods_supported: ['header'],
			authorization_servers: [baseUrl],
		};

		if (resource.scopes.length > 0) {
			metadata.scopes_supported = resource.scopes;
		}

		return metadata;
	}
}

/**
 * Static page for {@link OAuthController.webhookTester}. Self-contained (inline
 * CSS + JS, no build step) so it can be served straight from the controller. All
 * requests it makes (`/oauth/register`, `/oauth/authorize`, `/oauth/token`, the
 * `.well-known` discovery doc and the webhook itself) are same-origin, so the
 * browser needs no CORS grant. The pasted webhook's path is always resolved
 * against this instance's origin, so it only tests webhooks on this instance.
 */
const WEBHOOK_TESTER_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Webhook OAuth tester</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 15px/1.5 -apple-system, system-ui, sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1rem; }
  h1 { font-size: 1.4rem; }
  .card { border: 1px solid #8883; border-radius: 8px; padding: 1rem 1.25rem; margin: 1rem 0; }
  label { display: block; font-weight: 600; margin: .6rem 0 .2rem; }
  input, select { width: 100%; padding: .5rem; font: inherit; box-sizing: border-box; border: 1px solid #8886; border-radius: 6px; }
  select { width: auto; min-width: 8rem; }
  button { font: inherit; padding: .55rem 1rem; border-radius: 6px; border: 0; background: #ff6d5a; color: #fff; cursor: pointer; margin-top: .8rem; }
  button:disabled { opacity: .5; cursor: default; }
  pre { white-space: pre-wrap; word-break: break-all; background: #8881; padding: .6rem; border-radius: 6px; }
  #log div { padding: .15rem 0; font-family: ui-monospace, monospace; font-size: 13px; }
  .ok { color: #178a4c; } .err { color: #d4351c; }
  .muted { opacity: .7; font-size: 13px; }
  a { color: #ff6d5a; }
</style>
</head>
<body>
  <h1>Webhook OAuth tester</h1>
  <p class="muted">Dev tool. Make sure you are logged into this n8n instance as the user you want to test as, and that the workflow with an <b>n8n User Auth (OAuth2)</b> Webhook trigger is active.</p>

  <div class="card">
    <label for="wh">Webhook URL</label>
    <input id="wh" placeholder="http://localhost:5678/webhook/orders-creds" />
    <label for="method">Method the trigger listens on</label>
    <select id="method">
      <option>GET</option><option selected>POST</option><option>PUT</option>
      <option>PATCH</option><option>DELETE</option><option>HEAD</option>
    </select>
    <div><button id="go">Authorize</button></div>
  </div>

  <div class="card" id="result" style="display:none">
    <label>Access token</label>
    <pre id="token"></pre>
    <div id="aud" class="muted"></div>
    <label for="callMethod">Call with method</label>
    <select id="callMethod">
      <option>GET</option><option>POST</option><option>PUT</option>
      <option>PATCH</option><option>DELETE</option><option>HEAD</option>
    </select>
    <div><button id="callBtn">Call webhook with this token</button></div>
    <p class="muted">Pick any method and call. A multi-method trigger accepts this one token on <b>all</b> its methods. <code>401 invalid_token</code> means that method isn't part of this trigger (a different trigger, or the node doesn't listen on it).</p>
    <label>Webhook response</label>
    <pre id="response">-</pre>
  </div>

  <div class="card">
    <label>Log</label>
    <div id="log"></div>
  </div>

<script>
  var origin = window.location.origin;
  var pageUrl = origin + window.location.pathname;
  function el(id){ return document.getElementById(id); }
  function log(msg, cls){ var d = document.createElement('div'); if (cls) d.className = cls; d.textContent = msg; el('log').appendChild(d); }
  function b64url(bytes){ return btoa(String.fromCharCode.apply(null, new Uint8Array(bytes))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,''); }
  async function pkce(){ var v = b64url(crypto.getRandomValues(new Uint8Array(48))); var c = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))); return { v: v, c: c }; }
  function decodeAud(t){ try { var b = t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'); while (b.length % 4) b += '='; return JSON.parse(atob(b)).aud; } catch (e) { return '(unable to decode)'; } }

  async function authorize(){
    var raw = el('wh').value.trim();
    var method = el('method').value;
    if (!raw) { log('Enter a webhook URL', 'err'); return; }
    var u; try { u = new URL(raw); } catch (e) { log('Invalid URL', 'err'); return; }
    var whPath = u.pathname;

    log('Discovering resource for ' + whPath + ' ...');
    var resource = null;
    try {
      // Method-less probe resolves a single-method trigger regardless of the picked
      // method; the picked method then disambiguates a multi-method path.
      var probes = ['', '?method=' + method];
      for (var i = 0; i < probes.length; i++) {
        var rp = await fetch(origin + '/.well-known/oauth-protected-resource' + whPath + probes[i]);
        if (rp.ok) { resource = (await rp.json()).resource; break; }
      }
    } catch (e) { log('Discovery error: ' + e, 'err'); return; }
    if (!resource) { log('Discovery failed (404). Check: node auth = "n8n User Auth (OAuth2)", workflow saved + active, the method matches, and the flag is on.', 'err'); return; }
    var callMethod = method;
    try { callMethod = new URL(resource).searchParams.get('method') || method; } catch (e) {}
    log('resource = ' + resource + '  (call method: ' + callMethod + ')', 'ok');

    log('Registering OAuth client ...');
    var clientId;
    try {
      var rr = await fetch(origin + '/oauth/register', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client_name: 'webhook-tester', redirect_uris: [pageUrl], grant_types: ['authorization_code'], token_endpoint_auth_method: 'none' }) });
      if (!rr.ok) { log('Register failed (HTTP ' + rr.status + ')', 'err'); return; }
      clientId = (await rr.json()).client_id;
    } catch (e) { log('Register error: ' + e, 'err'); return; }

    var p = await pkce();
    var state = b64url(crypto.getRandomValues(new Uint8Array(12)));
    sessionStorage.setItem('wt', JSON.stringify({ v: p.v, clientId: clientId, resource: resource, whUrl: origin + whPath, method: callMethod, state: state }));

    var authUrl = origin + '/oauth/authorize?response_type=code'
      + '&client_id=' + encodeURIComponent(clientId)
      + '&redirect_uri=' + encodeURIComponent(pageUrl)
      + '&code_challenge=' + encodeURIComponent(p.c)
      + '&code_challenge_method=S256'
      + '&state=' + encodeURIComponent(state)
      + '&resource=' + encodeURIComponent(resource);
    log('Redirecting to consent ...');
    window.location.href = authUrl;
  }

  async function onCallback(code, state){
    var raw = sessionStorage.getItem('wt');
    if (!raw) { log('No pending session. Open the page fresh and click Authorize.', 'err'); return; }
    var s = JSON.parse(raw);
    if (state !== s.state) { log('State mismatch, aborting.', 'err'); return; }
    log('Exchanging code for token ...');
    var token;
    try {
      var body = new URLSearchParams({ grant_type: 'authorization_code', code: code, redirect_uri: pageUrl, client_id: s.clientId, code_verifier: s.v, resource: s.resource });
      var r = await fetch(origin + '/oauth/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: body });
      var j = await r.json();
      if (!r.ok || !j.access_token) { log('Token exchange failed: ' + JSON.stringify(j), 'err'); return; }
      token = j.access_token;
    } catch (e) { log('Token error: ' + e, 'err'); return; }
    window.__wt = { token: token, whUrl: s.whUrl, method: s.method };
    el('token').textContent = token;
    el('aud').textContent = 'aud = ' + decodeAud(token);
    el('callMethod').value = s.method;
    el('result').style.display = 'block';
    log('Token acquired', 'ok');
    history.replaceState({}, '', pageUrl);
  }

  async function callWebhook(){
    if (!window.__wt) return;
    var c = window.__wt;
    var m = el('callMethod').value;
    log('Calling ' + m + ' ' + c.whUrl + ' ...');
    try {
      var r = await fetch(c.whUrl, { method: m, headers: { Authorization: 'Bearer ' + c.token } });
      var text = await r.text();
      log('HTTP ' + r.status + (r.status === 401 ? ' - token not accepted for ' + m : ''), r.ok ? 'ok' : 'err');
      el('response').textContent = text || '(empty body)';
    } catch (e) { log('Call error: ' + e, 'err'); }
  }

  el('go').addEventListener('click', authorize);
  el('callBtn').addEventListener('click', callWebhook);

  (function init(){
    var q = new URLSearchParams(window.location.search);
    if (q.get('error')) { log('Authorize error: ' + q.get('error') + ' ' + (q.get('error_description') || ''), 'err'); history.replaceState({}, '', pageUrl); return; }
    var code = q.get('code');
    if (code) { onCallback(code, q.get('state')); }
  })();
</script>
</body>
</html>`;
