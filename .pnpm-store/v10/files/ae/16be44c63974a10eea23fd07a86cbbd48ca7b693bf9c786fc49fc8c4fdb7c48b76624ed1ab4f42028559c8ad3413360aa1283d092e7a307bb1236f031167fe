import { GoogleAbstractedFetchClient, ensureAuthOptionScopes } from "@langchain/google-common";
import { GoogleAuth } from "google-auth-library";

//#region src/auth.ts
var GAuthClient = class extends GoogleAbstractedFetchClient {
	gauth;
	constructor(fields) {
		super();
		this.gauth = new GoogleAuth(ensureAuthOptionScopes(fields?.authOptions, "scopes", fields?.platformType));
		this._fetch = async (...args) => {
			const url = args[0];
			const opts = args[1] ?? {};
			opts.responseType = "stream";
			return await this.gauth.fetch(url, opts);
		};
	}
	get clientType() {
		return "gauth";
	}
	async getProjectId() {
		return this.gauth.getProjectId();
	}
	async request(opts) {
		return this._request(opts?.url, opts, {});
	}
};

//#endregion
export { GAuthClient };
//# sourceMappingURL=auth.js.map