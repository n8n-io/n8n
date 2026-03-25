const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_common = require('./common.cjs');
const node_crypto = require_rolldown_runtime.__toESM(require("node:crypto"));

//#region src/utils/tencent_hunyuan/index.ts
const sha256 = (data) => (0, node_crypto.createHash)("sha256").update(data).digest("hex");
const hmacSha256 = (data, key) => (0, node_crypto.createHmac)("sha256", key).update(data).digest();
const hmacSha256Hex = (data, key) => (0, node_crypto.createHmac)("sha256", key).update(data).digest("hex");
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
	const payloadHash = sha256(JSON.stringify(payload));
	const canonicalRequest = `POST\n/\n\ncontent-type:${contentType}\nhost:${host}\n\n${require_common.signedHeaders}\n${payloadHash}`;
	const date = require_common.getDate(timestamp);
	const signature = hmacSha256Hex(`TC3-HMAC-SHA256\n${timestamp}\n${date}/${require_common.service}/tc3_request\n${sha256(canonicalRequest)}`, hmacSha256("tc3_request", hmacSha256(require_common.service, hmacSha256(date, `TC3${secretKey}`))));
	return `TC3-HMAC-SHA256 Credential=${secretId}/${date}/${require_common.service}/tc3_request, SignedHeaders=${require_common.signedHeaders}, Signature=${signature}`;
};

//#endregion
exports.sign = sign;
//# sourceMappingURL=index.cjs.map