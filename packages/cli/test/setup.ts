import nock from 'nock';

export default async () => {
	// Disable network connections for faster, more reliable tests
	nock.disableNetConnect();
	nock.enableNetConnect('127.0.0.1');

	// Optimize test performance
	process.env.N8N_LOG_LEVEL = 'silent';
	process.env.NODE_ENV = 'test';

	// Prevent memory leaks in tests
	process.setMaxListeners(20);
};
