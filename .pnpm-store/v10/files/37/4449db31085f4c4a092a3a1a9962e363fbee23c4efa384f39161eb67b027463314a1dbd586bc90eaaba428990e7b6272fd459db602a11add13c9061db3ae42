import { __exportAll } from "../_virtual/_rolldown/runtime.js";
//#region src/utils/ssrf.ts
var ssrf_exports = /* @__PURE__ */ __exportAll({
	isCloudMetadata: () => isCloudMetadata,
	isLocalhost: () => isLocalhost,
	isPrivateIp: () => isPrivateIp,
	isSafeUrl: () => isSafeUrl,
	isSameOrigin: () => isSameOrigin,
	validateSafeUrl: () => validateSafeUrl
});
const PRIVATE_IP_RANGES = [
	"10.0.0.0/8",
	"172.16.0.0/12",
	"192.168.0.0/16",
	"127.0.0.0/8",
	"169.254.0.0/16",
	"0.0.0.0/8",
	"::1/128",
	"fc00::/7",
	"fe80::/10",
	"ff00::/8"
];
const CLOUD_METADATA_IPS = [
	"169.254.169.254",
	"169.254.170.2",
	"100.100.100.200"
];
const CLOUD_METADATA_HOSTNAMES = [
	"metadata.google.internal",
	"metadata",
	"instance-data"
];
const LOCALHOST_NAMES = ["localhost", "localhost.localdomain"];
/**
* IPv4 regex: four octets 0-255
*/
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
/**
* Check if a string is a valid IPv4 address.
*/
function isIPv4(ip) {
	return IPV4_REGEX.test(ip);
}
/**
* Check if a string is a valid IPv6 address.
* Uses expandIpv6 for validation.
*/
function isIPv6(ip) {
	return expandIpv6(ip) !== null;
}
/**
* Check if a string is a valid IP address (IPv4 or IPv6).
*/
function isIP(ip) {
	return isIPv4(ip) || isIPv6(ip);
}
/**
* Parse an IP address string to an array of integers (for IPv4) or an array of 16-bit values (for IPv6)
* Returns null if the IP is invalid.
*/
function parseIp(ip) {
	if (isIPv4(ip)) return ip.split(".").map((octet) => parseInt(octet, 10));
	else if (isIPv6(ip)) {
		const expanded = expandIpv6(ip);
		if (!expanded) return null;
		const parts = expanded.split(":");
		const result = [];
		for (const part of parts) result.push(parseInt(part, 16));
		return result;
	}
	return null;
}
/**
* Expand compressed IPv6 address to full form.
*/
function expandIpv6(ip) {
	if (!ip || typeof ip !== "string") return null;
	if (!ip.includes(":")) return null;
	if (!/^[0-9a-fA-F:]+$/.test(ip)) return null;
	let normalized = ip;
	if (normalized.includes("::")) {
		const parts = normalized.split("::");
		if (parts.length > 2) return null;
		const [left, right] = parts;
		const leftParts = left ? left.split(":") : [];
		const rightParts = right ? right.split(":") : [];
		const missing = 8 - (leftParts.length + rightParts.length);
		if (missing < 0) return null;
		const zeros = Array(missing).fill("0");
		normalized = [
			...leftParts,
			...zeros,
			...rightParts
		].filter((p) => p !== "").join(":");
	}
	const parts = normalized.split(":");
	if (parts.length !== 8) return null;
	for (const part of parts) {
		if (part.length === 0 || part.length > 4) return null;
		if (!/^[0-9a-fA-F]+$/.test(part)) return null;
	}
	return parts.map((p) => p.padStart(4, "0").toLowerCase()).join(":");
}
/**
* Parse CIDR notation (e.g., "192.168.0.0/24") into network address and prefix length.
*/
function parseCidr(cidr) {
	const [addrStr, prefixStr] = cidr.split("/");
	if (!addrStr || !prefixStr) return null;
	const addr = parseIp(addrStr);
	if (!addr) return null;
	const prefixLen = parseInt(prefixStr, 10);
	if (isNaN(prefixLen)) return null;
	const isIpv6 = isIPv6(addrStr);
	if (isIpv6 && prefixLen > 128) return null;
	if (!isIpv6 && prefixLen > 32) return null;
	return {
		addr,
		prefixLen,
		isIpv6
	};
}
/**
* Check if an IP address is in a given CIDR range.
*/
function isIpInCidr(ip, cidr) {
	const ipParsed = parseIp(ip);
	if (!ipParsed) return false;
	const cidrParsed = parseCidr(cidr);
	if (!cidrParsed) return false;
	const isIpv6 = isIPv6(ip);
	if (isIpv6 !== cidrParsed.isIpv6) return false;
	const { addr: cidrAddr, prefixLen } = cidrParsed;
	if (isIpv6) for (let i = 0; i < Math.ceil(prefixLen / 16); i++) {
		const mask = 65535 << 16 - Math.min(16, prefixLen - i * 16) & 65535;
		if ((ipParsed[i] & mask) !== (cidrAddr[i] & mask)) return false;
	}
	else for (let i = 0; i < Math.ceil(prefixLen / 8); i++) {
		const mask = 255 << 8 - Math.min(8, prefixLen - i * 8) & 255;
		if ((ipParsed[i] & mask) !== (cidrAddr[i] & mask)) return false;
	}
	return true;
}
/**
* Check if an IP address is private (RFC 1918, loopback, link-local, etc.)
*/
function isPrivateIp(ip) {
	if (!isIP(ip)) return false;
	for (const range of PRIVATE_IP_RANGES) if (isIpInCidr(ip, range)) return true;
	return false;
}
/**
* Check if a hostname or IP is a known cloud metadata endpoint.
*/
function isCloudMetadata(hostname, ip) {
	if (CLOUD_METADATA_IPS.includes(ip || "")) return true;
	const lowerHostname = hostname.toLowerCase();
	if (CLOUD_METADATA_HOSTNAMES.includes(lowerHostname)) return true;
	return false;
}
/**
* Check if a hostname or IP is localhost.
*/
function isLocalhost(hostname, ip) {
	if (ip) {
		if (ip === "127.0.0.1" || ip === "::1" || ip === "0.0.0.0") return true;
		if (ip.startsWith("127.")) return true;
	}
	const lowerHostname = hostname.toLowerCase();
	if (LOCALHOST_NAMES.includes(lowerHostname)) return true;
	return false;
}
/**
* Validate that a URL is safe to connect to.
* Performs static validation checks against hostnames and direct IP addresses.
* Does not perform DNS resolution.
*
* @param url URL to validate
* @param options.allowPrivate Allow private IPs (default: false)
* @param options.allowHttp Allow http:// scheme (default: false)
* @returns The validated URL
* @throws Error if URL is not safe
*/
function validateSafeUrl(url, options) {
	const allowPrivate = options?.allowPrivate ?? false;
	const allowHttp = options?.allowHttp ?? false;
	try {
		let parsedUrl;
		try {
			parsedUrl = new URL(url);
		} catch {
			throw new Error(`Invalid URL: ${url}`);
		}
		const hostname = parsedUrl.hostname;
		if (!hostname) throw new Error("URL missing hostname.");
		if (isCloudMetadata(hostname)) throw new Error(`URL points to cloud metadata endpoint: ${hostname}`);
		if (isLocalhost(hostname)) {
			if (!allowPrivate) throw new Error(`URL points to localhost: ${hostname}`);
			return url;
		}
		const scheme = parsedUrl.protocol;
		if (scheme !== "http:" && scheme !== "https:") throw new Error(`Invalid URL scheme: ${scheme}. Only http and https are allowed.`);
		if (scheme === "http:" && !allowHttp) throw new Error("HTTP scheme not allowed. Use HTTPS or set allowHttp: true.");
		if (isIP(hostname)) {
			const ip = hostname;
			if (isLocalhost(hostname, ip)) {
				if (!allowPrivate) throw new Error(`URL points to localhost: ${hostname}`);
				return url;
			}
			if (isCloudMetadata(hostname, ip)) throw new Error(`URL resolves to cloud metadata IP: ${ip} (${hostname})`);
			if (isPrivateIp(ip)) {
				if (!allowPrivate) throw new Error(`URL resolves to private IP: ${ip} (${hostname}). Set allowPrivate: true to allow.`);
			}
			return url;
		}
		return url;
	} catch (error) {
		if (error && typeof error === "object" && "message" in error) throw error;
		throw new Error(`URL validation failed: ${error}`);
	}
}
/**
* Check if a URL is safe to connect to (non-throwing version).
*
* @param url URL to check
* @param options.allowPrivate Allow private IPs (default: false)
* @param options.allowHttp Allow http:// scheme (default: false)
* @returns true if URL is safe, false otherwise
*/
function isSafeUrl(url, options) {
	try {
		validateSafeUrl(url, options);
		return true;
	} catch {
		return false;
	}
}
/**
* Check if two URLs have the same origin (scheme, host, port).
* Uses semantic URL parsing to prevent SSRF bypasses via URL variations.
*
* @param url1 First URL
* @param url2 Second URL
* @returns true if both URLs have the same origin, false otherwise
*/
function isSameOrigin(url1, url2) {
	try {
		return new URL(url1).origin === new URL(url2).origin;
	} catch {
		return false;
	}
}
//#endregion
export { isCloudMetadata, isLocalhost, isPrivateIp, isSafeUrl, isSameOrigin, ssrf_exports, validateSafeUrl };

//# sourceMappingURL=ssrf.js.map