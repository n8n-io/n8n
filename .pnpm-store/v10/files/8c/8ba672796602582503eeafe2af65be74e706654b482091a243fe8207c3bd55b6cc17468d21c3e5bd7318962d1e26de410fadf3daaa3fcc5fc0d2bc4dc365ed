const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const jsonwebtoken = require_rolldown_runtime.__toESM(require("jsonwebtoken"));

//#region src/utils/zhipuai.ts
const API_TOKEN_TTL_SECONDS = 180;
const CACHE_TTL_SECONDS = API_TOKEN_TTL_SECONDS - 30;
const tokenCache = {};
const encodeApiKey = (apiSecretKey, cache = true) => {
	if (!apiSecretKey) throw new Error("Api_key is required");
	try {
		if (tokenCache[apiSecretKey] && Date.now() - tokenCache[apiSecretKey].createAt < CACHE_TTL_SECONDS * 1e3) return tokenCache[apiSecretKey].token;
		const [apiKey, secret] = apiSecretKey.split(".");
		const payload = {
			api_key: apiKey,
			exp: Math.round(Date.now() * 1e3) + API_TOKEN_TTL_SECONDS * 1e3,
			timestamp: Math.round(Date.now() * 1e3)
		};
		const ret = jsonwebtoken.default.sign(payload, secret, {
			algorithm: "HS256",
			header: {
				alg: "HS256",
				sign_type: "SIGN"
			}
		});
		if (cache) tokenCache[apiSecretKey] = {
			token: ret,
			createAt: Date.now()
		};
		return ret;
	} catch {
		throw new Error("invalid api_key");
	}
};

//#endregion
exports.encodeApiKey = encodeApiKey;
//# sourceMappingURL=zhipuai.cjs.map