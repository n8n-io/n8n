import nock from 'nock';

export default async () => {
	// Disable network connections for faster, more reliable tests
	nock.disableNetConnect();
	nock.enableNetConnect('127.0.0.1');

	// Optimize test performance
	process.env.N8N_LOG_LEVEL = 'silent';
	process.env.NODE_ENV = 'test';

	// Database optimization for tests
	process.env.DB_SQLITE_POOL_SIZE = '1';
	process.env.DB_LOGGING_ENABLED = 'false';
	process.env.CACHE_REDIS_ENABLED = 'false';

	// Prevent memory leaks in tests
	process.setMaxListeners(30);

	// Optimize garbage collection for tests
	if (global.gc) {
		global.gc();
	}
};
