import { lookup } from 'node:dns/promises';

/** RFC-1918 / loopback / link-local / IETF reserved ranges. */
const PRIVATE_RANGES = [
	// 10.0.0.0/8
	{ start: ip4ToNum('10.0.0.0'), end: ip4ToNum('10.255.255.255') },
	// 172.16.0.0/12
	{ start: ip4ToNum('172.16.0.0'), end: ip4ToNum('172.31.255.255') },
	// 192.168.0.0/16
	{ start: ip4ToNum('192.168.0.0'), end: ip4ToNum('192.168.255.255') },
	// 127.0.0.0/8  (loopback)
	{ start: ip4ToNum('127.0.0.0'), end: ip4ToNum('127.255.255.255') },
	// 169.254.0.0/16  (link-local)
	{ start: ip4ToNum('169.254.0.0'), end: ip4ToNum('169.254.255.255') },
	// 0.0.0.0/8
	{ start: ip4ToNum('0.0.0.0'), end: ip4ToNum('0.255.255.255') },
	// 100.64.0.0/10  (Carrier-grade NAT, RFC 6598 — common in cloud VPCs)
	{ start: ip4ToNum('100.64.0.0'), end: ip4ToNum('100.127.255.255') },
	// 192.0.0.0/24  (IETF protocol assignments, RFC 6890)
	{ start: ip4ToNum('192.0.0.0'), end: ip4ToNum('192.0.0.255') },
	// 198.18.0.0/15  (Benchmarking, RFC 2544)
	{ start: ip4ToNum('198.18.0.0'), end: ip4ToNum('198.19.255.255') },
	// 240.0.0.0/4  (Reserved, class E)
	{ start: ip4ToNum('240.0.0.0'), end: ip4ToNum('255.255.255.255') },
];

/** IPv6 loopback and link-local prefixes. */
const PRIVATE_IPV6_PREFIXES = ['::1', 'fe80:', 'fd', 'fc'];

/** Regex for IPv4-mapped IPv6 addresses like ::ffff:127.0.0.1 or ::ffff:7f00:1 */
const IPV4_MAPPED_IPV6_DOTTED = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i;
const IPV4_MAPPED_IPV6_HEX = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i;

function ip4ToNum(ip: string): number {
	const parts = ip.split('.').map(Number);
	// eslint-disable-next-line no-bitwise
	return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
	const num = ip4ToNum(ip);
	return PRIVATE_RANGES.some((r) => num >= r.start && num <= r.end);
}

/**
 * Extract the embedded IPv4 address from an IPv4-mapped IPv6 address.
 * Handles both dotted notation (::ffff:127.0.0.1) and hex notation (::ffff:7f00:1).
 * Returns null if the address is not an IPv4-mapped IPv6 address.
 */
function extractMappedIPv4(ip: string): string | null {
	const dottedMatch = IPV4_MAPPED_IPV6_DOTTED.exec(ip);
	if (dottedMatch) return dottedMatch[1];

	const hexMatch = IPV4_MAPPED_IPV6_HEX.exec(ip);
	if (hexMatch) {
		const high = parseInt(hexMatch[1], 16);
		const low = parseInt(hexMatch[2], 16);
		// eslint-disable-next-line no-bitwise
		return `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
	}

	return null;
}

function isPrivateIPv6(ip: string): boolean {
	const lower = ip.toLowerCase();

	// Check IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1, ::ffff:7f00:1)
	const mappedIPv4 = extractMappedIPv4(lower);
	if (mappedIPv4 !== null) {
		return isPrivateIPv4(mappedIPv4);
	}

	return PRIVATE_IPV6_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/**
 * Validates that a URL points to a public internet host.
 * Blocks non-HTTP(S) schemes, private/loopback IPs, and IPv6 link-local.
 *
 * @throws Error if the URL fails any SSRF check
 */
export async function assertPublicUrl(url: string): Promise<void> {
	const parsed = new URL(url);

	// Only allow http and https
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		throw new Error(
			`Blocked: scheme "${parsed.protocol}" is not allowed. Only HTTP(S) is supported.`,
		);
	}

	// Resolve hostname to IP and check against private ranges
	const hostname = parsed.hostname;

	// Check if hostname is already an IP literal
	if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
		if (isPrivateIPv4(hostname)) {
			throw new Error(`Blocked: ${hostname} resolves to a private IP address.`);
		}
		return;
	}

	if (hostname.startsWith('[') || hostname.includes(':')) {
		const bare = hostname.replace(/^\[|\]$/g, '');
		if (isPrivateIPv6(bare)) {
			throw new Error(`Blocked: ${hostname} resolves to a private IPv6 address.`);
		}
		return;
	}

	// DNS resolve and check all returned addresses
	try {
		const result = await lookup(hostname, { all: true });
		for (const { address, family } of result) {
			if (family === 4 && isPrivateIPv4(address)) {
				throw new Error(`Blocked: ${hostname} resolves to a private IP address (${address}).`);
			}
			if (family === 6 && isPrivateIPv6(address)) {
				throw new Error(`Blocked: ${hostname} resolves to a private IPv6 address (${address}).`);
			}
		}
	} catch (error) {
		if (error instanceof Error && error.message.startsWith('Blocked:')) {
			throw error;
		}
		throw new Error(
			`DNS resolution failed for ${hostname}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
