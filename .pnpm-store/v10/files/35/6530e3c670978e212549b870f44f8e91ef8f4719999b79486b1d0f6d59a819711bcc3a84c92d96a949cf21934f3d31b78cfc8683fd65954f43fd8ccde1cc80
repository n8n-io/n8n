const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_common = require('./common.cjs');
const crypto_js_sha256_js = require_rolldown_runtime.__toESM(require("crypto-js/sha256.js"));
const crypto_js_hmac_sha256_js = require_rolldown_runtime.__toESM(require("crypto-js/hmac-sha256.js"));

//#region src/utils/tencent_hunyuan/web.ts
/**
* Method that calculate Tencent Cloud API v3 signature
* for making requests to the Tencent Cloud API.
* See https://cloud.tencent.com/document/api/1729/101843.
* @param host Tencent Cloud API host.
* @param payload HTTP request body.
* @param timestamp Sign timestamp in seconds.
* @param secretId Tencent Cloud Secret ID, which can be obtained from https://console.cloud.tencent.com/cam/capi.
* @param secretKey Tencent Cloud Secret Key, which can be obtained from https://console.cloud.tencent.com/cam/capi.
* @param headers HTTP request headers.
* @returns The signature for making requests to the Tencent API.
*/
const sign = (host, payload, timestamp, secretId, secretKey, headers) => {
	const contentType = headers["Content-Type"];
	const payloadHash = (0, crypto_js_sha256_js.default)(JSON.stringify(payload));
	const canonicalRequest = `POST\n/\n\ncontent-type:${contentType}\nhost:${host}\n\n${require_common.signedHeaders}\n${payloadHash}`;
	const date = require_common.getDate(timestamp);
	const signature = (0, crypto_js_hmac_sha256_js.default)(`TC3-HMAC-SHA256\n${timestamp}\n${date}/${require_common.service}/tc3_request\n${(0, crypto_js_sha256_js.default)(canonicalRequest).toString()}`, (0, crypto_js_hmac_sha256_js.default)("tc3_request", (0, crypto_js_hmac_sha256_js.default)(require_common.service, (0, crypto_js_hmac_sha256_js.default)(date, `TC3${secretKey}`)))).toString();
	return `TC3-HMAC-SHA256 Credential=${secretId}/${date}/${require_common.service}/tc3_request, SignedHeaders=${require_common.signedHeaders}, Signature=${signature}`;
};

//#endregion
exports.sign = sign;
//# sourceMappingURL=web.cjs.map