const require_stream = require('./utils/stream.cjs');

//#region src/auth.ts
var GoogleAbstractedFetchClient = class {
	_fetch = fetch;
	async _buildData(res, opts) {
		switch (opts.responseType) {
			case "json": return res.json();
			case "stream": return new require_stream.ReadableJsonStream(res.body);
			default: return res.blob();
		}
	}
	/**
	* Build and throw a standardised Google request error.
	* Both the `!res.ok` path (native fetch) and the catch path (gaxios)
	* funnel through here so the caller always sees the same shape.
	*/
	_throwRequestError(status, body, response, context) {
		const message = body ? `Google request failed with status code ${status}: ${body}` : `Google request failed with status code ${status}`;
		const error = new Error(message);
		error.response = response;
		error.details = context;
		throw error;
	}
	async _request(url, opts, additionalHeaders) {
		if (url == null) throw new Error("Missing URL");
		const fetchOptions = {
			method: opts.method,
			headers: {
				"Content-Type": "application/json",
				...opts.headers ?? {},
				...additionalHeaders ?? {}
			},
			signal: opts.signal
		};
		if (opts.data !== void 0) if (typeof opts.data === "string") fetchOptions.body = opts.data;
		else fetchOptions.body = JSON.stringify(opts.data);
		const context = {
			url,
			opts,
			fetchOptions
		};
		let res;
		try {
			res = await this._fetch(url, fetchOptions);
		} catch (fetchError) {
			const err = fetchError;
			const status = err?.response?.status ?? err?.status;
			if (status != null) {
				let body;
				if (err?.response?.data != null) {
					if (typeof err.response.data === "string") body = err.response.data;
					else if (typeof err.response.data === "object") try {
						body = JSON.stringify(err.response.data);
					} catch {}
				}
				this._throwRequestError(status, body, err?.response ?? { status }, context);
			}
			throw fetchError;
		}
		if (!res.ok) {
			const body = await res.text();
			this._throwRequestError(res.status, body, res, context);
		}
		return {
			data: await this._buildData(res, opts),
			config: {},
			status: res.status,
			statusText: res.statusText,
			headers: res.headers,
			request: { responseURL: res.url }
		};
	}
};
var ApiKeyGoogleAuth = class extends GoogleAbstractedFetchClient {
	apiKey;
	constructor(apiKey) {
		super();
		this.apiKey = apiKey;
	}
	get clientType() {
		return "apiKey";
	}
	getProjectId() {
		throw new Error("APIs that require a project ID cannot use an API key");
	}
	request(opts) {
		const authHeader = { "X-Goog-Api-Key": this.apiKey };
		return this._request(opts.url, opts, authHeader);
	}
};
function aiPlatformScope(platform) {
	switch (platform) {
		case "gai": return ["https://www.googleapis.com/auth/generative-language"];
		default: return ["https://www.googleapis.com/auth/cloud-platform"];
	}
}
function ensureAuthOptionScopes(authOption, scopeProperty, scopesOrPlatform) {
	if (authOption && Object.hasOwn(authOption, scopeProperty)) return authOption;
	const scopes = Array.isArray(scopesOrPlatform) ? scopesOrPlatform : aiPlatformScope(scopesOrPlatform ?? "gcp");
	return {
		[scopeProperty]: scopes,
		...authOption ?? {}
	};
}

//#endregion
exports.ApiKeyGoogleAuth = ApiKeyGoogleAuth;
exports.GoogleAbstractedFetchClient = GoogleAbstractedFetchClient;
exports.aiPlatformScope = aiPlatformScope;
exports.ensureAuthOptionScopes = ensureAuthOptionScopes;
//# sourceMappingURL=auth.cjs.map