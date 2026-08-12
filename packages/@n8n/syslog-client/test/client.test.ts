import * as os from 'os';

import { Facility, Severity, SyslogClient, Transport } from '../src';
import { TLS_CERTIFICATE } from './setup';

describe('SyslogClient - Core', () => {
	describe('Constructor and defaults', () => {
		it('should set default options correctly', () => {
			const client = new SyslogClient();
			expect(client.target).toBe('127.0.0.1');
			expect(client.port).toBe(514);
			expect(client.syslogHostname).toBe(os.hostname());
			expect(client.tcpTimeout).toBe(10000);
			expect(client.transport).toBe(Transport.Udp);
			client.close();
		});

		it('should accept target parameter', () => {
			const client = new SyslogClient('127.0.0.2');
			expect(client.target).toBe('127.0.0.2');
			expect(client.port).toBe(514);
			expect(client.syslogHostname).toBe(os.hostname());
			client.close();
		});

		it('should accept custom hostname', () => {
			const client = new SyslogClient('127.0.0.2', {
				syslogHostname: 'test',
			});
			expect(client.target).toBe('127.0.0.2');
			expect(client.syslogHostname).toBe('test');
			client.close();
		});

		it('should accept custom port and timeout', () => {
			const client = new SyslogClient('127.0.0.2', {
				syslogHostname: 'test',
				port: 5555,
				tcpTimeout: 50,
			});
			expect(client.port).toBe(5555);
			expect(client.tcpTimeout).toBe(50);
			client.close();
		});

		it('should accept TCP transport option', () => {
			const client = new SyslogClient('127.0.0.2', {
				port: 5555,
				transport: Transport.Tcp,
			});
			expect(client.transport).toBe(Transport.Tcp);
			client.close();
		});

		it('should accept TLS transport with certificate', () => {
			const client = new SyslogClient('127.0.0.2', {
				port: 6514,
				transport: Transport.Tls,
				tlsCA: TLS_CERTIFICATE,
			});
			expect(client.transport).toBe(Transport.Tls);
			expect(client.tlsCA).toBe(TLS_CERTIFICATE);
			client.close();
		});

		it('should accept facility and severity options', () => {
			const client = new SyslogClient('127.0.0.1', {
				facility: Facility.Mail,
				severity: Severity.Critical,
			});
			expect(client.facility).toBe(Facility.Mail);
			expect(client.severity).toBe(Severity.Critical);
			client.close();
		});

		it('should accept RFC format option', () => {
			const client = new SyslogClient('127.0.0.1', {
				rfc3164: false,
			});
			expect(client.rfc3164).toBe(false);
			client.close();
		});
	});
});
