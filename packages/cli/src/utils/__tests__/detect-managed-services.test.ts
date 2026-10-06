import { detectDbVendor, detectRedisVendor } from '../detect-managed-services';

const none = { aurora: false, rds: false, azure: false, cloudSql: false };

describe('detectDbVendor', () => {
	it.each([
		['rds', 'db.abc.eu-west-1.rds.amazonaws.com', null],
		['rds', 'DB.ABC.EU-WEST-1.RDS.AMAZONAWS.COM.', null],
		['rds', 'db.abc.cn-north-1.rds.amazonaws.com.cn', null],
		['azure', 'n8n.postgres.database.azure.com', null],
		[
			'aurora',
			'cluster-x.cluster-y.eu-west-1.rds.amazonaws.com',
			{ ...none, rds: true, aurora: true },
		],
		['rds', 'rds-proxy.example.com', { ...none, rds: true }],
		['azure', 'pg.example.com', { ...none, azure: true }],
		['cloud-sql', '10.0.0.5', { ...none, cloudSql: true }],
		['other', 'postgres', none],
		['other', 'localhost', null],
	])('returns %s for %s', (expected, host, markers) => {
		expect(detectDbVendor(host, markers)).toBe(expected);
	});

	it('does not match a host that only contains the suffix text', () => {
		expect(detectDbVendor('rds.amazonaws.com.evil.example', null)).toBe('other');
	});
});

describe('detectRedisVendor', () => {
	it.each([
		['elasticache', 'n8n.abc.0001.euw1.cache.amazonaws.com', ''],
		['azure-cache', 'n8n.redis.cache.windows.net', ''],
		['azure-cache', 'n8n.westeurope.redis.azure.net', ''],
		['other', 'redis', ''],
		['other', '10.0.0.4', ''],
	])('returns %s for host %s', (expected, host, clusterNodes) => {
		expect(detectRedisVendor(host, clusterNodes)).toBe(expected);
	});

	it('reads the first cluster node, without its port, when cluster nodes are set', () => {
		const nodes = 'a.cache.amazonaws.com:6379,b.cache.amazonaws.com:6379';
		expect(detectRedisVendor('localhost', nodes)).toBe('elasticache');
	});
});
