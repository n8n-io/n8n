import { SyslogClient, Transport } from '../src';
import {
	awaitUdpMsg,
	constructRfc5424Regex,
	constructSyslogRegex,
	startTestServers,
	stopTestServers,
	SYSLOG_UDP_PORT,
} from './setup';

beforeAll(async () => {
	await startTestServers();
});

afterAll(() => {
	stopTestServers();
});

describe('SyslogClient - Message Formats', () => {
	describe('RFC 3164 (BSD syslog)', () => {
		it('should send RFC 3164 format by default', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				syslogHostname: hostname,
				transport: Transport.Udp,
			});

			await client.log('RFC 3164 test');
			const msg = await awaitUdpMsg();
			expect(msg).toMatch(constructSyslogRegex(134, hostname, 'RFC 3164 test'));

			client.close();
		});

		it('should send RFC 3164 format when explicitly enabled', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				syslogHostname: hostname,
				transport: Transport.Udp,
				rfc3164: true,
			});

			await client.log('RFC 3164 explicit');
			const msg = await awaitUdpMsg();
			expect(msg).toMatch(constructSyslogRegex(134, hostname, 'RFC 3164 explicit'));

			client.close();
		});

		it('should send back-dated RFC 3164 messages', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				syslogHostname: hostname,
				transport: Transport.Udp,
			});

			const backdate = new Date(2017, 2, 1);
			await client.log('Back-dated test', { timestamp: backdate });

			const msg = await awaitUdpMsg();
			expect(msg).toMatch(constructSyslogRegex(134, hostname, 'Back-dated test', backdate));

			client.close();
		});

		it('should handle messages with custom options', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				syslogHostname: hostname,
				transport: Transport.Udp,
			});

			await client.log('Custom options', {
				rfc3164: true,
				msgid: '12345', // msgid is ignored in RFC 3164
			});

			const msg = await awaitUdpMsg();
			expect(msg).toMatch(constructSyslogRegex(134, hostname, 'Custom options'));

			client.close();
		});
	});

	describe('RFC 5424 (modern syslog)', () => {
		it('should send RFC 5424 format when enabled', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				syslogHostname: hostname,
				transport: Transport.Udp,
				rfc3164: false,
			});

			await client.log('RFC 5424 test');
			const msg = await awaitUdpMsg();
			expect(msg).toMatch(constructRfc5424Regex(134, hostname, 'RFC 5424 test', '-'));

			client.close();
		});

		it('should use default msgid when not provided', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				syslogHostname: hostname,
				transport: Transport.Udp,
			});

			await client.log('Default msgid', { rfc3164: false });

			const msg = await awaitUdpMsg();
			expect(msg).toMatch(constructRfc5424Regex(134, hostname, 'Default msgid', '-'));

			client.close();
		});

		it('should use custom msgid when provided', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				syslogHostname: hostname,
				transport: Transport.Udp,
			});

			await client.log('Custom msgid', {
				rfc3164: false,
				msgid: '98765',
			});

			const msg = await awaitUdpMsg();
			expect(msg).toMatch(constructRfc5424Regex(134, hostname, 'Custom msgid', '98765'));

			client.close();
		});

		it('should accept msgid up to 32 characters (RFC 5424 limit)', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				syslogHostname: hostname,
				transport: Transport.Udp,
			});

			const maxLengthMsgid = '550e8400e29b41d4a716446655440000'; // 32 chars (UUID without hyphens)
			await client.log('Max length msgid', {
				rfc3164: false,
				msgid: maxLengthMsgid,
			});

			const msg = await awaitUdpMsg();
			expect(msg).toMatch(constructRfc5424Regex(134, hostname, 'Max length msgid', maxLengthMsgid));

			client.close();
		});

		it('should reject msgid longer than 32 characters (RFC 5424 limit)', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				syslogHostname: hostname,
				transport: Transport.Udp,
			});

			const tooLongMsgid = '550e8400-e29b-41d4-a716-446655440000'; // 36 chars (UUID with hyphens)
			await expect(
				client.log('Too long msgid', {
					rfc3164: false,
					msgid: tooLongMsgid,
				}),
			).rejects.toThrow();

			client.close();
		});

		it('should send back-dated RFC 5424 messages', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				syslogHostname: hostname,
				transport: Transport.Udp,
			});

			const backdate = new Date(2017, 2, 1);
			await client.log('Back-dated RFC 5424', {
				rfc3164: false,
				msgid: '98765',
				timestamp: backdate,
			});

			const msg = await awaitUdpMsg();
			expect(msg).toMatch(
				constructRfc5424Regex(134, hostname, 'Back-dated RFC 5424', '98765', backdate),
			);

			client.close();
		});

		it('should include process ID in RFC 5424 messages', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				syslogHostname: hostname,
				transport: Transport.Udp,
				rfc3164: false,
			});

			await client.log('Process ID test');
			const msg = await awaitUdpMsg();

			// Check that message contains a process ID (numeric)
			expect(msg).toMatch(/\d+ - - Process ID test/);

			client.close();
		});
	});

	describe('Format switching', () => {
		it('should allow switching format per message', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				syslogHostname: hostname,
				transport: Transport.Udp,
				rfc3164: true, // Default to RFC 3164
			});

			// Send RFC 3164 message (default)
			await client.log('Message 1');
			const msg1 = await awaitUdpMsg();
			expect(msg1).toMatch(constructSyslogRegex(134, hostname, 'Message 1'));

			// Send RFC 5424 message (override)
			await client.log('Message 2', { rfc3164: false });
			const msg2 = await awaitUdpMsg();
			expect(msg2).toMatch(constructRfc5424Regex(134, hostname, 'Message 2', '-'));

			// Send RFC 3164 message again (back to default)
			await client.log('Message 3');
			const msg3 = await awaitUdpMsg();
			expect(msg3).toMatch(constructSyslogRegex(134, hostname, 'Message 3'));

			client.close();
		});
	});

	describe('Message content', () => {
		it('should preserve newlines in message', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				syslogHostname: hostname,
				transport: Transport.Udp,
			});

			const messageWithNewline = 'Message with\nnewline';
			await client.log(messageWithNewline);
			const msg = await awaitUdpMsg();

			expect(msg).toContain(messageWithNewline);

			client.close();
		});

		it('should handle empty messages', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				syslogHostname: hostname,
				transport: Transport.Udp,
			});

			await client.log('');
			const msg = await awaitUdpMsg();

			expect(msg).toMatch(constructSyslogRegex(134, hostname, ''));

			client.close();
		});
	});
});
