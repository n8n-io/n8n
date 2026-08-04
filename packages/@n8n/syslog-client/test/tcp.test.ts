import { Facility, Severity, SyslogClient, Transport } from '../src';
import {
	awaitTcpMsg,
	constructSyslogRegex,
	startTestServers,
	stopTestServers,
	SYSLOG_TCP_PORT,
} from './setup';

beforeAll(async () => {
	await startTestServers();
});

afterAll(() => {
	stopTestServers();
});

describe('SyslogClient - TCP Transport', () => {
	describe('Basic functionality', () => {
		it('should connect and send log messages', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_TCP_PORT,
				syslogHostname: hostname,
				transport: Transport.Tcp,
			});

			await client.log('This is a test');
			const msg1 = await awaitTcpMsg();
			expect(msg1).toMatch(constructSyslogRegex(134, hostname, 'This is a test'));

			await client.log('This is a second test');
			const msg2 = await awaitTcpMsg();
			expect(msg2).toMatch(constructSyslogRegex(134, hostname, 'This is a second test'));

			client.close();
		});

		it('should work with promise API', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_TCP_PORT,
				syslogHostname: hostname,
				transport: Transport.Tcp,
			});

			await client.log('Promise test');
			const msg = await awaitTcpMsg();
			expect(msg).toMatch(constructSyslogRegex(134, hostname, 'Promise test'));

			client.close();
		});

		it('should work with callback API', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_TCP_PORT,
				syslogHostname: hostname,
				transport: Transport.Tcp,
			});

			const callbackPromise = new Promise<void>((resolve) => {
				void client.log('Callback test', (error) => {
					expect(error).toBeUndefined();
					resolve();
				});
			});

			const msg = await awaitTcpMsg();
			expect(msg).toMatch(constructSyslogRegex(134, hostname, 'Callback test'));
			await callbackPromise;

			client.close();
		});
	});

	describe('Transport reuse', () => {
		it('should reuse TCP transport for multiple messages', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_TCP_PORT,
				syslogHostname: hostname,
				transport: Transport.Tcp,
			});

			await client.log('Transport reuse test');
			await awaitTcpMsg();
			const transport1 = client['transport_'];
			expect(transport1).toBeDefined();

			await client.log('Transport reuse test 2');
			await awaitTcpMsg();
			const transport2 = client['transport_'];
			expect(transport2).toBe(transport1);

			client.close();
		});
	});

	describe('Close and reconnect', () => {
		it('should emit close event', async () => {
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_TCP_PORT,
				transport: Transport.Tcp,
			});

			const closePromise = new Promise<void>((resolve) => {
				client.once('close', resolve);
			});

			await client.log('Test');
			await awaitTcpMsg();
			client.close();
			await closePromise;

			expect(client['transport_']).toBeUndefined();
		});

		it('should reconnect after close', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_TCP_PORT,
				syslogHostname: hostname,
				transport: Transport.Tcp,
			});

			await client.log('Before close');
			await awaitTcpMsg();

			const closePromise = new Promise<void>((resolve) => {
				client.once('close', resolve);
			});
			client.close();
			await closePromise;

			await client.log('After reconnect');
			const msg = await awaitTcpMsg();
			expect(msg).toMatch(constructSyslogRegex(134, hostname, 'After reconnect'));

			client.close();
		});
	});

	describe('Log options', () => {
		it('should accept options with callback', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_TCP_PORT,
				syslogHostname: hostname,
				transport: Transport.Tcp,
			});

			const callbackPromise = new Promise<void>((resolve) => {
				void client.log(
					'With options',
					{
						facility: Facility.System,
						severity: Severity.Notice,
					},
					(error) => {
						expect(error).toBeUndefined();
						resolve();
					},
				);
			});

			const msg = await awaitTcpMsg();
			expect(msg).toMatch(constructSyslogRegex(29, hostname, 'With options'));
			await callbackPromise;
			client.close();
		});

		it('should calculate correct PRI value', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_TCP_PORT,
				syslogHostname: hostname,
				transport: Transport.Tcp,
			});

			await client.log('Test', {
				facility: Facility.Local0,
				severity: Severity.Emergency,
			});

			const msg = await awaitTcpMsg();
			expect(msg).toMatch(constructSyslogRegex(128, hostname, 'Test'));
			client.close();
		});
	});

	describe('Error handling', () => {
		it('should handle connection timeout', async () => {
			const client = new SyslogClient('203.0.113.1', {
				port: SYSLOG_TCP_PORT,
				tcpTimeout: 500,
				transport: Transport.Tcp,
			});

			const errorPromise = new Promise<Error>((resolve) => {
				client.on('error', resolve);
			});

			await expect(client.log("Shouldn't work")).rejects.toThrow();
			const error = await errorPromise;
			expect(error).toBeInstanceOf(Error);
		});

		it('should handle invalid port', () => {
			expect(() => {
				new SyslogClient('127.0.0.1', {
					port: 502342323,
					tcpTimeout: 2000,
					transport: Transport.Tcp,
				});
			}).toThrow();
		});
	});
});
