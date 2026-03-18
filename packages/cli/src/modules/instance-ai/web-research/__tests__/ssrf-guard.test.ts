import * as dns from 'node:dns/promises';

import { assertPublicUrl } from '../ssrf-guard';

jest.mock('node:dns/promises');

const mockLookup = dns.lookup as jest.MockedFunction<typeof dns.lookup>;

describe('assertPublicUrl', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('allows public IP addresses', async () => {
		mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as never);
		await expect(assertPublicUrl('https://example.com')).resolves.toBeUndefined();
	});

	it('blocks non-HTTP(S) schemes', async () => {
		await expect(assertPublicUrl('ftp://example.com')).rejects.toThrow(
			'scheme "ftp:" is not allowed',
		);
	});

	it('blocks file:// scheme', async () => {
		await expect(assertPublicUrl('file:///etc/passwd')).rejects.toThrow(
			'scheme "file:" is not allowed',
		);
	});

	it('blocks 127.x.x.x loopback', async () => {
		mockLookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }] as never);
		await expect(assertPublicUrl('https://localhost')).rejects.toThrow('private IP');
	});

	it('blocks 10.x.x.x private range', async () => {
		mockLookup.mockResolvedValue([{ address: '10.0.0.1', family: 4 }] as never);
		await expect(assertPublicUrl('https://internal.corp')).rejects.toThrow('private IP');
	});

	it('blocks 172.16.x.x private range', async () => {
		mockLookup.mockResolvedValue([{ address: '172.16.0.1', family: 4 }] as never);
		await expect(assertPublicUrl('https://internal.corp')).rejects.toThrow('private IP');
	});

	it('blocks 192.168.x.x private range', async () => {
		mockLookup.mockResolvedValue([{ address: '192.168.1.1', family: 4 }] as never);
		await expect(assertPublicUrl('https://home.local')).rejects.toThrow('private IP');
	});

	it('blocks 169.254.x.x link-local', async () => {
		mockLookup.mockResolvedValue([{ address: '169.254.169.254', family: 4 }] as never);
		await expect(assertPublicUrl('https://metadata.cloud')).rejects.toThrow('private IP');
	});

	it('blocks IPv6 loopback ::1', async () => {
		mockLookup.mockResolvedValue([{ address: '::1', family: 6 }] as never);
		await expect(assertPublicUrl('https://ipv6-local')).rejects.toThrow('private IPv6');
	});

	it('blocks IPv4 literal private IP', async () => {
		await expect(assertPublicUrl('https://192.168.1.1/path')).rejects.toThrow('private IP');
	});

	it('allows IPv4 literal public IP', async () => {
		await expect(assertPublicUrl('https://8.8.8.8/path')).resolves.toBeUndefined();
	});

	it('handles DNS resolution failure', async () => {
		mockLookup.mockRejectedValue(new Error('ENOTFOUND'));
		await expect(assertPublicUrl('https://nonexistent.invalid')).rejects.toThrow(
			'DNS resolution failed',
		);
	});

	it('blocks when any resolved address is private', async () => {
		mockLookup.mockResolvedValue([
			{ address: '93.184.216.34', family: 4 },
			{ address: '10.0.0.1', family: 4 },
		] as never);
		await expect(assertPublicUrl('https://dual-stack.example')).rejects.toThrow('private IP');
	});
});
