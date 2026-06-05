import dns from 'node:dns/promises';

import { validateExternalAgentUrl } from '../validate-agent-url';

jest.mock('node:dns/promises');

const mockedDns = jest.mocked(dns);

describe('validateExternalAgentUrl', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('should accept valid HTTPS URL with public IP', async () => {
		mockedDns.resolve.mockResolvedValue(['93.184.216.34']);
		await expect(validateExternalAgentUrl('https://example.com/api')).resolves.not.toThrow();
	});

	it('should reject HTTP URL', async () => {
		await expect(validateExternalAgentUrl('http://example.com/api')).rejects.toThrow(
			'External agent URL must use HTTPS protocol.',
		);
	});

	it('should reject invalid URL', async () => {
		await expect(validateExternalAgentUrl('not-a-url')).rejects.toThrow(
			'External agent URL is not a valid URL.',
		);
	});

	it('should reject loopback IP 127.0.0.1', async () => {
		await expect(validateExternalAgentUrl('https://127.0.0.1/api')).rejects.toThrow(
			'private or loopback',
		);
	});

	it('should reject private IP 10.x.x.x', async () => {
		await expect(validateExternalAgentUrl('https://10.0.0.1/api')).rejects.toThrow(
			'private or loopback',
		);
	});

	it('should reject private IP 172.16.x.x', async () => {
		await expect(validateExternalAgentUrl('https://172.16.0.1/api')).rejects.toThrow(
			'private or loopback',
		);
	});

	it('should reject private IP 192.168.x.x', async () => {
		await expect(validateExternalAgentUrl('https://192.168.1.1/api')).rejects.toThrow(
			'private or loopback',
		);
	});

	it('should reject link-local IP 169.254.x.x', async () => {
		await expect(validateExternalAgentUrl('https://169.254.169.254/api')).rejects.toThrow(
			'private or loopback',
		);
	});

	it('should reject hostname resolving to private IP', async () => {
		mockedDns.resolve.mockResolvedValue(['192.168.1.100']);
		await expect(validateExternalAgentUrl('https://internal.corp/api')).rejects.toThrow(
			'private or loopback',
		);
	});

	it('should reject hostname resolving to loopback', async () => {
		mockedDns.resolve.mockResolvedValue(['127.0.0.1']);
		await expect(validateExternalAgentUrl('https://localhost.evil.com/api')).rejects.toThrow(
			'private or loopback',
		);
	});

	it('should reject unresolvable hostname', async () => {
		mockedDns.resolve.mockRejectedValue(new Error('ENOTFOUND'));
		await expect(validateExternalAgentUrl('https://nonexistent.invalid/api')).rejects.toThrow(
			'could not be resolved',
		);
	});

	it('should accept hostname resolving to public IP', async () => {
		mockedDns.resolve.mockResolvedValue(['93.184.216.34']);
		await expect(validateExternalAgentUrl('https://example.com/api')).resolves.not.toThrow();
	});

	it('should reject IPv6 loopback ::1', async () => {
		await expect(validateExternalAgentUrl('https://[::1]/api')).rejects.toThrow(
			'private or loopback',
		);
	});
});
