import type { ManagedPostgresMarkers } from '@n8n/db';

export type DbVendor = 'aurora' | 'rds' | 'azure' | 'cloud-sql' | 'other';

export type RedisVendor = 'elasticache' | 'azure-cache' | 'other';

const normalize = (host: string) => host.trim().toLowerCase().replace(/\.$/, '');

const endsWithAny = (host: string, suffixes: string[]) =>
	suffixes.some((suffix) => host.endsWith(suffix));

/**
 * Names the managed Postgres service from the host suffix and the server's own
 * markers. The host name itself is never reported, only the result.
 * Aurora comes first because its host names end in the same suffix as RDS.
 */
export function detectDbVendor(host: string, markers: ManagedPostgresMarkers | null): DbVendor {
	const h = normalize(host);
	if (markers?.aurora) return 'aurora';
	if (markers?.rds || endsWithAny(h, ['.rds.amazonaws.com', '.rds.amazonaws.com.cn'])) return 'rds';
	if (markers?.azure || h.endsWith('.postgres.database.azure.com')) return 'azure';
	if (markers?.cloudSql) return 'cloud-sql';
	return 'other';
}

/**
 * Names the managed Redis service from the host suffix. In cluster mode the
 * first node decides, as every node of one cluster belongs to the same service.
 */
export function detectRedisVendor(host: string, clusterNodes: string): RedisVendor {
	const first = clusterNodes.split(',')[0]?.trim();
	const h = normalize(first ? first.replace(/:\d+$/, '') : host);
	if (h.endsWith('.cache.amazonaws.com')) return 'elasticache';
	if (endsWithAny(h, ['.redis.cache.windows.net', '.redis.azure.net'])) return 'azure-cache';
	return 'other';
}
