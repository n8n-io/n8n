import dns from 'node:dns/promises';
import net from 'node:net';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

const BLOCKED_IPV4_RANGES = [
	{ prefix: '127.', label: 'loopback' },
	{ prefix: '10.', label: 'private (10.0.0.0/8)' },
	{ prefix: '0.', label: 'unspecified' },
	{ prefix: '169.254.', label: 'link-local' },
];

function isBlockedIpV4(ip: string): string | undefined {
	for (const range of BLOCKED_IPV4_RANGES) {
		if (ip.startsWith(range.prefix)) return range.label;
	}

	// 172.16.0.0/12
	if (ip.startsWith('172.')) {
		const second = parseInt(ip.split('.')[1], 10);
		if (second >= 16 && second <= 31) return 'private (172.16.0.0/12)';
	}

	// 192.168.0.0/16
	if (ip.startsWith('192.168.')) return 'private (192.168.0.0/16)';

	return undefined;
}

function isBlockedIpV6(ip: string): boolean {
	const normalized = ip.toLowerCase();
	return (
		normalized === '::1' ||
		normalized === '::' ||
		normalized.startsWith('fc') ||
		normalized.startsWith('fd') ||
		normalized.startsWith('fe80')
	);
}

function isBlockedIp(ip: string): boolean {
	if (net.isIPv4(ip)) return isBlockedIpV4(ip) !== undefined;
	if (net.isIPv6(ip)) return isBlockedIpV6(ip);
	return false;
}

export async function validateExternalAgentUrl(url: string): Promise<void> {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw new BadRequestError('External agent URL is not a valid URL.');
	}

	if (parsed.protocol !== 'https:') {
		throw new BadRequestError('External agent URL must use HTTPS protocol.');
	}

	// Strip brackets from IPv6 literals (e.g. "[::1]" → "::1")
	const hostname = parsed.hostname.replace(/^\[|\]$/g, '');

	// Check if hostname is already an IP literal
	if (net.isIP(hostname)) {
		if (isBlockedIp(hostname)) {
			throw new BadRequestError(
				'External agent URL must not resolve to a private or loopback address.',
			);
		}
		return;
	}

	// Resolve hostname and check all IPs
	let addresses: string[];
	try {
		const results = await dns.resolve(hostname);
		addresses = results;
	} catch {
		throw new BadRequestError(`External agent URL hostname "${hostname}" could not be resolved.`);
	}

	for (const ip of addresses) {
		if (isBlockedIp(ip)) {
			throw new BadRequestError(
				'External agent URL must not resolve to a private or loopback address.',
			);
		}
	}
}
