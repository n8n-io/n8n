import { ensureError } from 'n8n-workflow';
import { BlockList, isIP } from 'node:net';
import { z } from 'zod';

export interface IpRangeIssue {
	entry: string;
	error: string;
}

export interface IpRangeBuildResult {
	list: BlockList;
	issues: IpRangeIssue[];
}

/**
 * Builds a `net.BlockList` from a list of CIDR IP ranges.
 * Used for both allowlists and blocklists.
 * Invalid entries are skipped and collected into an `issues` array for the caller to log.
 */
export function buildIpRangeList(cidrRanges: readonly string[]): IpRangeBuildResult {
	const list = new BlockList();
	const issues: IpRangeIssue[] = [];

	for (const rawEntry of cidrRanges) {
		const entry = rawEntry.trim();
		if (entry.length === 0) {
			continue;
		}

		try {
			const cidr = parseCidr(entry);
			if (!cidr) {
				issues.push({ entry, error: 'Invalid CIDR notation' });
				continue;
			}

			list.addSubnet(cidr.network, cidr.prefix, cidr.family);
		} catch (e) {
			const error = ensureError(e);
			issues.push({ entry, error: `Failed to add IP range: ${error.message}` });
		}
	}

	return { list, issues };
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

	const [network, prefixStr] = result.data.split('/');
	const family = validateIp(network);
	if (family === null) {
		return null;
	}

	const prefix = Number.parseInt(prefixStr, 10);
	return { network, prefix, family };
}

const cidrSchema = z.string().cidr();

function validateIp(ip: string): 'ipv4' | 'ipv6' | null {
	const version = isIP(ip);
	if (version === 4) return 'ipv4';
	if (version === 6) return 'ipv6';
	return null;
}
