import { HttpsProxyAgent } from 'https-proxy-agent';
import { getHttpProxyAgent } from '../httpProxyAgent';

// Mock the https-proxy-agent package
jest.mock('https-proxy-agent', () => ({
	HttpsProxyAgent: jest.fn().mockImplementation((url) => ({ proxyUrl: url })),
}));

describe('getHttpProxyAgent', () => {
	// Store original environment variables
	const originalEnv = { ...process.env };

	// Reset environment variables before each test
	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };
		delete process.env.HTTP_PROXY;
		delete process.env.http_proxy;
		delete process.env.HTTPS_PROXY;
		delete process.env.https_proxy;
		delete process.env.NO_PROXY;
		delete process.env.no_proxy;
	});

	// Restore original environment after all tests
	afterAll(() => {
		process.env = originalEnv;
	});

	it('should return undefined when no proxy environment variables are set', () => {
		const agent = getHttpProxyAgent();
		expect(agent).toBeUndefined();
		expect(HttpsProxyAgent).not.toHaveBeenCalled();
	});

	it('should create HttpsProxyAgent when HTTP_PROXY is set', () => {
		const proxyUrl = 'http://proxy.example.com:8080';
		process.env.HTTP_PROXY = proxyUrl;

		const agent = getHttpProxyAgent();

		expect(HttpsProxyAgent).toHaveBeenCalledWith(proxyUrl);
		expect(agent).toEqual({ proxyUrl });
	});

	it('should create HttpsProxyAgent when http_proxy is set', () => {
		const proxyUrl = 'http://proxy.example.com:8080';
		process.env.http_proxy = proxyUrl;

		const agent = getHttpProxyAgent();

		expect(HttpsProxyAgent).toHaveBeenCalledWith(proxyUrl);
		expect(agent).toEqual({ proxyUrl });
	});

	it('should create HttpsProxyAgent when HTTPS_PROXY is set', () => {
		const proxyUrl = 'http://proxy.example.com:8080';
		process.env.HTTPS_PROXY = proxyUrl;

		const agent = getHttpProxyAgent();

		expect(HttpsProxyAgent).toHaveBeenCalledWith(proxyUrl);
		expect(agent).toEqual({ proxyUrl });
	});

	it('should create HttpsProxyAgent when https_proxy is set', () => {
		const proxyUrl = 'http://proxy.example.com:8080';
		process.env.https_proxy = proxyUrl;

		const agent = getHttpProxyAgent();

		expect(HttpsProxyAgent).toHaveBeenCalledWith(proxyUrl);
		expect(agent).toEqual({ proxyUrl });
	});

	it('should respect priority order of proxy environment variables', () => {
		// Set multiple proxy environment variables
		process.env.HTTP_PROXY = 'http://http-proxy.example.com:8080';
		process.env.http_proxy = 'http://http-proxy-lowercase.example.com:8080';
		process.env.HTTPS_PROXY = 'http://https-proxy.example.com:8080';
		process.env.https_proxy = 'http://https-proxy-lowercase.example.com:8080';

		const agent = getHttpProxyAgent();

		// Should use HTTPS_PROXY as it has highest priority
		expect(HttpsProxyAgent).toHaveBeenCalledWith('http://https-proxy.example.com:8080');
		expect(agent).toEqual({ proxyUrl: 'http://https-proxy.example.com:8080' });
	});

	// NO_PROXY tests
	it('should return undefined when NO_PROXY matches IP address in baseURL', () => {
		process.env.HTTPS_PROXY = 'http://proxy.example.com:8080';
		process.env.NO_PROXY = '169.254.169.254';

		const agent = getHttpProxyAgent('http://169.254.169.254:8080/path');

		expect(agent).toBeUndefined();
		expect(HttpsProxyAgent).not.toHaveBeenCalled();
	});

	it('should return undefined when no_proxy matches full domain in baseURL', () => {
		process.env.HTTPS_PROXY = 'http://proxy.example.com:8080';
		process.env.no_proxy = 'example.com';

		const agent = getHttpProxyAgent('https://example.com/v1/api');

		expect(agent).toBeUndefined();
		expect(HttpsProxyAgent).not.toHaveBeenCalled();
	});

	it('should return undefined when NO_PROXY matches wildcard domain in baseURL', () => {
		process.env.HTTPS_PROXY = 'http://proxy.example.com:8080';
		process.env.NO_PROXY = '*.example.com';

		const agent = getHttpProxyAgent('https://api.example.com/subpath');

		expect(agent).toBeUndefined();
		expect(HttpsProxyAgent).not.toHaveBeenCalled();
	});

	it('should create HttpsProxyAgent when NO_PROXY does not match baseURL hostname', () => {
		const proxyUrl = 'http://proxy.example.com:8080';
		process.env.HTTPS_PROXY = proxyUrl;
		process.env.NO_PROXY = 'other.com';
		const agent = getHttpProxyAgent('https://example.com');

		expect(HttpsProxyAgent).toHaveBeenCalledWith(proxyUrl);
		expect(agent).toEqual({ proxyUrl: proxyUrl });
	});

	it('should return undefined when NO_PROXY matches multiple patterns', () => {
		process.env.HTTPS_PROXY = 'http://proxy.example.com:8080';
		process.env.NO_PROXY = '169.254.169.254,example.com,*.example.com';

		const agent = getHttpProxyAgent('https://sub.example.com:443/path');

		expect(agent).toBeUndefined();
		expect(HttpsProxyAgent).not.toHaveBeenCalled();
	});

	it('should create HttpsProxyAgent when NO_PROXY contains invalid IP', () => {
		const proxyUrl = 'http://proxy.example.com:8080';
		process.env.HTTPS_PROXY = proxyUrl;
		process.env.NO_PROXY = '256.256.256.256';

		const agent = getHttpProxyAgent('http://256.256.256.256');

		expect(HttpsProxyAgent).toHaveBeenCalledWith(proxyUrl);
		expect(agent).toEqual({ proxyUrl });
	});

	it('should create HttpsProxyAgent when NO_PROXY is empty', () => {
		const proxyUrl = 'http://proxy.example.com:8080';
		process.env.HTTPS_PROXY = proxyUrl;
		process.env.NO_PROXY = '';

		const agent = getHttpProxyAgent('https://example.com');

		expect(HttpsProxyAgent).toHaveBeenCalledWith(proxyUrl);
		expect(agent).toEqual({ proxyUrl });
	});

	it('should create HttpsProxyAgent when baseURL is undefined and proxy is set', () => {
		const proxyUrl = 'http://proxy.example.com:8080';
		process.env.HTTPS_PROXY = proxyUrl;
		process.env.NO_PROXY = 'example.com';

		const agent = getHttpProxyAgent();

		expect(HttpsProxyAgent).toHaveBeenCalledWith(proxyUrl);
		expect(agent).toEqual({ proxyUrl });
	});
});
