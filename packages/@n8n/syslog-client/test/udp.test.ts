import { SyslogClient, Transport } from '../src';
import {
	awaitUdpMsg,
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

describe('SyslogClient - UDP Transport', () => {
	describe('Basic functionality', () => {
		it('should connect and send log messages', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				syslogHostname: hostname,
				transport: Transport.Udp,
			});

			await client.log('This is a test');
			const msg1 = await awaitUdpMsg();
			expect(msg1).toMatch(constructSyslogRegex(134, hostname, 'This is a test'));

			await client.log('This is a second test');
			const msg2 = await awaitUdpMsg();
			expect(msg2).toMatch(constructSyslogRegex(134, hostname, 'This is a second test'));

			client.close();
		});

		it('should work with promise API', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				syslogHostname: hostname,
				transport: Transport.Udp,
			});

			await client.log('Promise test');
			const msg = await awaitUdpMsg();
			expect(msg).toMatch(constructSyslogRegex(134, hostname, 'Promise test'));

			client.close();
		});

		it('should work with callback API', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				syslogHostname: hostname,
				transport: Transport.Udp,
			});

			const callbackPromise = new Promise<void>((resolve) => {
				void client.log('Callback test', (error) => {
					expect(error).toBeUndefined();
					resolve();
				});
			});

			const msg = await awaitUdpMsg();
			expect(msg).toMatch(constructSyslogRegex(134, hostname, 'Callback test'));
			await callbackPromise;

			client.close();
		});
	});

	describe('Transport reuse', () => {
		it('should reuse UDP transport for multiple messages', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				syslogHostname: hostname,
				transport: Transport.Udp,
			});

			await client.log('Transport reuse test');
			await awaitUdpMsg();
			const transport1 = client['transport_'];
			expect(transport1).toBeDefined();

			await client.log('Transport reuse test 2');
			await awaitUdpMsg();
			const transport2 = client['transport_'];
			expect(transport2).toBe(transport1);

			client.close();
		});
	});

	describe('UDP bind address', () => {
		it('should bind to specific network address', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				syslogHostname: hostname,
				transport: Transport.Udp,
				udpBindAddress: '127.0.0.1',
			});

			await client.log('Bind test');
			const msg = await awaitUdpMsg();
			expect(msg).toMatch(constructSyslogRegex(134, hostname, 'Bind test'));

			client.close();
		});

		it('should handle invalid bind address', () => {
			expect(() => {
				new SyslogClient('127.0.0.1', {
					port: SYSLOG_UDP_PORT,
					transport: Transport.Udp,
					udpBindAddress: '500.500.500.500',
				});
			}).toThrow();
		});
	});

	describe('Close and reconnect', () => {
		it('should emit close event', async () => {
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				transport: Transport.Udp,
			});

			const closePromise = new Promise<void>((resolve) => {
				client.once('close', resolve);
			});

			await client.log('Test');
			await awaitUdpMsg();
			client.close();
			await closePromise;

			expect(client['transport_']).toBeUndefined();
		});

		it('should reconnect after close', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('127.0.0.1', {
				port: SYSLOG_UDP_PORT,
				syslogHostname: hostname,
				transport: Transport.Udp,
			});

			await client.log('Before close');
			await awaitUdpMsg();

			const closePromise = new Promise<void>((resolve) => {
				client.once('close', resolve);
			});
			client.close();
			await closePromise;

			await client.log('After reconnect');
			const msg = await awaitUdpMsg();
			expect(msg).toMatch(constructSyslogRegex(134, hostname, 'After reconnect'));

			client.close();
		});
	});

	describe('Error handling', () => {
		it('should handle invalid port', () => {
			expect(() => {
				new SyslogClient('127.0.0.1', {
					port: 12378726362,
					transport: Transport.Udp,
				});
			}).toThrow();
		});
	});
});
