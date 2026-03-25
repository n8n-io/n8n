let _langchain_google_common = require("@langchain/google-common");
let google_auth_library = require("google-auth-library");

//#region src/auth.ts
var GAuthClient = class extends _langchain_google_common.GoogleAbstractedFetchClient {
	gauth;
	constructor(fields) {
		super();
		this.gauth = new google_auth_library.GoogleAuth((0, _langchain_google_common.ensureAuthOptionScopes)(fields?.authOptions, "scopes", fields?.platformType));
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
exports.GAuthClient = GAuthClient;
//# sourceMappingURL=auth.cjs.map