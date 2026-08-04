import { ConnectionError, SyslogClient, Transport } from '../src';
import {
	awaitTlsMsg,
	constructSyslogRegex,
	startTestServers,
	stopTestServers,
	SYSLOG_TLS_PORT,
	TLS_CERTIFICATE,
	WRONG_CERTIFICATE,
} from './setup';

beforeAll(async () => {
	await startTestServers();
});

afterAll(() => {
	stopTestServers();
});

describe('SyslogClient - TLS Transport', () => {
	describe('Basic functionality', () => {
		it('should connect and send log messages', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('localhost', {
				port: SYSLOG_TLS_PORT,
				syslogHostname: hostname,
				transport: Transport.Tls,
				tlsCA: TLS_CERTIFICATE,
			});

			await client.log('This is a test');
			const msg1 = await awaitTlsMsg();
			expect(msg1).toMatch(constructSyslogRegex(134, hostname, 'This is a test'));

			await client.log('This is a second test');
			const msg2 = await awaitTlsMsg();
			expect(msg2).toMatch(constructSyslogRegex(134, hostname, 'This is a second test'));

			client.close();
		});

		it('should work with promise API', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('localhost', {
				port: SYSLOG_TLS_PORT,
				syslogHostname: hostname,
				transport: Transport.Tls,
				tlsCA: TLS_CERTIFICATE,
			});

			await client.log('Promise test');
			const msg = await awaitTlsMsg();
			expect(msg).toMatch(constructSyslogRegex(134, hostname, 'Promise test'));

			client.close();
		});

		it('should work with callback API', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('localhost', {
				port: SYSLOG_TLS_PORT,
				syslogHostname: hostname,
				transport: Transport.Tls,
				tlsCA: TLS_CERTIFICATE,
			});

			const callbackPromise = new Promise<void>((resolve) => {
				void client.log('Callback test', (error) => {
					expect(error).toBeUndefined();
					resolve();
				});
			});

			const msg = await awaitTlsMsg();
			expect(msg).toMatch(constructSyslogRegex(134, hostname, 'Callback test'));
			await callbackPromise;

			client.close();
		});
	});

	describe('Transport reuse', () => {
		it('should reuse TLS transport for multiple messages', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('localhost', {
				port: SYSLOG_TLS_PORT,
				syslogHostname: hostname,
				transport: Transport.Tls,
				tlsCA: TLS_CERTIFICATE,
			});

			await client.log('Transport reuse test');
			await awaitTlsMsg();
			const transport1 = client['transport_'];
			expect(transport1).toBeDefined();

			await client.log('Transport reuse test 2');
			await awaitTlsMsg();
			const transport2 = client['transport_'];
			expect(transport2).toBe(transport1);

			client.close();
		});
	});

	describe('Close and reconnect', () => {
		it('should emit close event', async () => {
			const client = new SyslogClient('localhost', {
				port: SYSLOG_TLS_PORT,
				transport: Transport.Tls,
				tlsCA: TLS_CERTIFICATE,
			});

			const closePromise = new Promise<void>((resolve) => {
				client.once('close', resolve);
			});

			await client.log('Test');
			await awaitTlsMsg();
			client.close();
			await closePromise;

			expect(client['transport_']).toBeUndefined();
		});

		it('should reconnect after close', async () => {
			const hostname = 'testhostname';
			const client = new SyslogClient('localhost', {
				port: SYSLOG_TLS_PORT,
				syslogHostname: hostname,
				transport: Transport.Tls,
				tlsCA: TLS_CERTIFICATE,
			});

			await client.log('Before close');
			await awaitTlsMsg();

			const closePromise = new Promise<void>((resolve) => {
				client.once('close', resolve);
			});
			client.close();
			await closePromise;

			await client.log('After reconnect');
			const msg = await awaitTlsMsg();
			expect(msg).toMatch(constructSyslogRegex(134, hostname, 'After reconnect'));

			client.close();
		});
	});

	describe('Certificate validation', () => {
		it('should reject invalid certificate', async () => {
			const client = new SyslogClient('localhost', {
				port: SYSLOG_TLS_PORT,
				transport: Transport.Tls,
				tlsCA: WRONG_CERTIFICATE,
			});

			const errorPromise = new Promise<Error>((resolve) => {
				client.on('error', resolve);
			});

			await expect(client.log('Should error')).rejects.toBeInstanceOf(ConnectionError);

			const error: NodeJS.ErrnoException = await errorPromise;
			expect(error.code).toBe('DEPTH_ZERO_SELF_SIGNED_CERT');
		});

		it('should handle connection timeout', async () => {
			const client = new SyslogClient('203.0.113.1', {
				port: SYSLOG_TLS_PORT,
				tcpTimeout: 500,
				transport: Transport.Tls,
				tlsCA: TLS_CERTIFICATE,
			});

			const errorPromise = new Promise<Error>((resolve) => {
				client.on('error', resolve);
			});

			await expect(client.log("Shouldn't work")).rejects.toThrow();
			const error = await errorPromise;
			expect(error).toBeInstanceOf(Error);
		});
	});
});
