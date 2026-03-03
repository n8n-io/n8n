import { BlockList, isIP } from 'node:net';
import { z } from 'zod';

export interface BlocklistIssue {
	entry: string;
	error: string;
}

export interface BlocklistBuildResult {
	blocklist: BlockList;
	issues: BlocklistIssue[];
}

/**
 * Builds a `net.BlockList` from a list of IP ranges (CIDR notation or single IPs).
 * Invalid entries are skipped and collected into an `issues` array for the caller to log.
 */
export function buildBlocklist(ranges: readonly string[]): BlocklistBuildResult {
	const blocklist = new BlockList();
	const issues: BlocklistIssue[] = [];

	for (const entry of ranges) {
		try {
			if (entry.includes('/')) {
				const cidr = parseCidr(entry);
				if (!cidr) {
					issues.push({ entry, error: 'Invalid CIDR notation' });
					continue;
				}

				blocklist.addSubnet(cidr.network, cidr.prefix, cidr.family);
			} else {
				const family = validateIp(entry);
				if (family === null) {
					issues.push({ entry, error: 'Invalid IP address' });
					continue;
				}

				blocklist.addAddress(entry, family);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			issues.push({ entry, error: `Failed to add to blocklist: ${errorMessage}` });
		}
	}

	return { blocklist, issues };
}

/**
 * Parse and validate a CIDR entry into network, prefix, and IP family.
 */
function parseCidr(
	entry: string,
): { network: string; prefix: number; family: 'ipv4' | 'ipv6' } | null {
	const result = cidrSchema.safeParse(entry);
	if (!result.success) {
		return null;
	}

	return result.data;
}

const cidrSchema = z.string().transform((value, ctx) => {
	const parts = value.split('/');
	if (parts.length !== 2) {
		ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CIDR must include exactly one "/"' });
		return z.NEVER;
	}

	const [network, prefixStr] = parts;
	if (!/^\d+$/.test(prefixStr)) {
		ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CIDR prefix must be an integer' });
		return z.NEVER;
	}

	const family = validateIp(network);
	if (family === null) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'CIDR network must be a valid IP address',
		});
		return z.NEVER;
	}

	const prefix = Number.parseInt(prefixStr, 10);
	const maxPrefix = family === 'ipv4' ? 32 : 128;
	if (prefix > maxPrefix) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: `CIDR prefix out of range for ${family}`,
		});
		return z.NEVER;
	}

	return { network, prefix, family };
});

function validateIp(ip: string): 'ipv4' | 'ipv6' | null {
	const version = isIP(ip);
	if (version === 4) return 'ipv4';
	if (version === 6) return 'ipv6';
	return null;
}
