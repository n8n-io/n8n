/**
 * A scripted SMTP server on a loopback socket, for the tests of the Send Email node. The v1
 * node (nodemailer) and the native SMTP client of the runtime talk to the same server, so
 * the test compares what each one sent.
 *
 * The server has two ports: one that starts without TLS (and offers STARTTLS when the
 * behaviour says so), and one with TLS from the first byte. It never connects to another
 * machine.
 */
import { readFileSync } from 'node:fs';
import net from 'node:net';
import type { AddressInfo } from 'node:net';
import { dirname, join } from 'node:path';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const TESTDATA = join(here, '../../../../../../workflow-runtime/src/shell/testdata');

/** The certificate of the tests of the runtime: self-signed, for `localhost`. */
export const SMTP_TEST_CERT = join(TESTDATA, 'tls-test-cert.pem');
const SMTP_TEST_KEY = join(TESTDATA, 'tls-test-key.pem');

/** How the server behaves for the connections of one case. */
export interface SmtpBehaviour {
	/** The server offers STARTTLS on the port without TLS. */
	starttls?: boolean;
	/** The mechanisms of the AUTH line. Absent: the server has no AUTH. */
	auth?: string;
	/** The server offers PIPELINING. The default is true. */
	pipelining?: boolean;
	/** The reply to a login. Absent: `235 2.7.0 ok`. */
	loginReply?: string;
	/** Recipients that the server refuses, with the reply for each. */
	refused?: Record<string, string>;
	/** The reply to the message. Absent: `250 2.0.0 queued`. */
	messageReply?: string;
}

/** What one connection sent. */
export interface SmtpSession {
	/** True when the connection had TLS when the message came. */
	tls: boolean;
	/** The command lines, without the line ends. The lines of a login are in it. */
	commands: string[];
	/** The bytes between the reply to DATA and the end line, as Latin-1 text. */
	message?: string;
}

export interface SmtpServer {
	/** The port that starts without TLS. */
	port: number;
	/** The port with TLS from the first byte. */
	securePort: number;
	/** Sets the behaviour and drops the sessions that the server kept. */
	script(behaviour: SmtpBehaviour): void;
	/** The sessions since the last `script` call, in the order of the connections. */
	sessions(): SmtpSession[];
	close(): Promise<void>;
}

export async function startSmtpServer(): Promise<SmtpServer> {
	const context = tls.createSecureContext({
		cert: readFileSync(SMTP_TEST_CERT),
		key: readFileSync(SMTP_TEST_KEY),
	});
	let behaviour: SmtpBehaviour = {};
	let kept: SmtpSession[] = [];
	const open = new Set<net.Socket>();

	const serve = (first: net.Socket, secure: boolean): void => {
		let socket = first;
		const session: SmtpSession = { tls: secure, commands: [] };
		kept.push(session);
		let buffer = Buffer.alloc(0);
		let inData = false;
		let login: 'none' | 'user' | 'password' = 'none';
		const send = (text: string) => socket.write(`${text}\r\n`);

		const ehlo = (): void => {
			const lines = ['mx.test'];
			if (behaviour.pipelining !== false) lines.push('PIPELINING');
			if (behaviour.starttls === true && !session.tls) lines.push('STARTTLS');
			if (behaviour.auth !== undefined) lines.push(`AUTH ${behaviour.auth}`);
			lines.push('SIZE 10485760');
			lines.forEach((line, k) => send(`250${k === lines.length - 1 ? ' ' : '-'}${line}`));
		};

		const command = (line: string): void => {
			session.commands.push(line);
			if (login === 'user') {
				login = 'password';
				send('334 UGFzc3dvcmQ6');
				return;
			}
			if (login === 'password') {
				login = 'none';
				send(behaviour.loginReply ?? '235 2.7.0 ok');
				return;
			}
			const verb = line.split(' ')[0].toUpperCase();
			if (verb === 'EHLO') return ehlo();
			if (verb === 'STARTTLS') {
				send('220 2.0.0 ready');
				socket.removeAllListeners('data');
				const upgraded = new tls.TLSSocket(socket, { isServer: true, secureContext: context });
				open.add(upgraded);
				upgraded.on('close', () => open.delete(upgraded));
				upgraded.on('error', () => {});
				session.tls = true;
				socket = upgraded;
				buffer = Buffer.alloc(0);
				upgraded.on('data', onData);
				return;
			}
			if (verb === 'AUTH') {
				if (line.toUpperCase() === 'AUTH LOGIN') {
					login = 'user';
					send('334 VXNlcm5hbWU6');
					return;
				}
				send(behaviour.loginReply ?? '235 2.7.0 ok');
				return;
			}
			if (verb === 'MAIL') return void send('250 2.1.0 ok');
			if (verb === 'RCPT') {
				const address = /<([^>]*)>/.exec(line)?.[1] ?? '';
				return void send(behaviour.refused?.[address] ?? '250 2.1.5 ok');
			}
			if (verb === 'DATA') {
				inData = true;
				return void send('354 go');
			}
			if (verb === 'QUIT') {
				send('221 2.0.0 bye');
				socket.end();
				return;
			}
			send('502 5.5.2 not known');
		};

		const onData = (chunk: Buffer): void => {
			buffer = Buffer.concat([buffer, chunk]);
			// One command or one message for each turn of the loop: the buffer bounds it.
			for (let left = buffer.length + 1; left > 0; left--) {
				if (inData) {
					const start = buffer.subarray(0, 3).toString('latin1') === '.\r\n' ? 0 : -1;
					const end = start === 0 ? 0 : buffer.indexOf('\r\n.\r\n');
					if (end < 0) return;
					session.message = buffer.subarray(0, start === 0 ? 0 : end + 2).toString('latin1');
					buffer = buffer.subarray(start === 0 ? 3 : end + 5);
					inData = false;
					send(behaviour.messageReply ?? '250 2.0.0 queued');
					continue;
				}
				const end = buffer.indexOf('\n');
				if (end < 0) return;
				const line = buffer.subarray(0, end).toString('latin1').replace(/\r$/, '');
				buffer = buffer.subarray(end + 1);
				command(line);
			}
		};

		open.add(socket);
		socket.on('close', () => open.delete(first));
		socket.on('error', () => {});
		socket.on('data', onData);
		send('220 mx.test ESMTP');
	};

	const plain = net.createServer((socket) => serve(socket, false));
	const secure = tls.createServer(
		{ cert: readFileSync(SMTP_TEST_CERT), key: readFileSync(SMTP_TEST_KEY) },
		(socket) => serve(socket, true),
	);
	secure.on('tlsClientError', () => {});
	await new Promise<void>((resolve) => plain.listen(0, '127.0.0.1', resolve));
	await new Promise<void>((resolve) => secure.listen(0, '127.0.0.1', resolve));
	const portOf = (server: net.Server) => (server.address() as AddressInfo).port;

	return {
		port: portOf(plain),
		securePort: portOf(secure),
		script(next) {
			behaviour = next;
			kept = [];
		},
		sessions: () => kept,
		async close() {
			for (const socket of open) socket.destroy();
			await new Promise((resolve) => plain.close(resolve));
			await new Promise((resolve) => secure.close(resolve));
		},
	};
}

const HEX = '[0-9a-f]';

/**
 * A message with the parts that change from run to run replaced: the hex digits of the
 * Message-ID and of each boundary, and the value of the Date header. Each replacement has
 * the length of what it replaces, so the size of the message stays.
 */
export function maskMessage(message: string): string {
	return message
		.replace(
			new RegExp(`<${HEX}{8}-${HEX}{4}-${HEX}{4}-${HEX}{4}-${HEX}{12}@`, 'g'),
			'<00000000-0000-0000-0000-000000000000@',
		)
		.replace(new RegExp(`--_NmP-${HEX}{16}-Part_`, 'g'), '--_NmP-0000000000000000-Part_')
		.replace(/^Date: .*$/m, (line) => `Date: ${'x'.repeat(line.length - 6)}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A copy of the result of the node with the parts that change from run to run replaced:
 * the two times, and the hex digits of the Message-ID.
 */
export function maskInfo(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(maskInfo);
	if (!isRecord(value)) return value;
	const out: Record<string, unknown> = {};
	for (const [key, member] of Object.entries(value)) {
		if ((key === 'envelopeTime' || key === 'messageTime') && typeof member === 'number') {
			out[key] = 0;
		} else if (key === 'messageId' && typeof member === 'string') {
			out[key] = maskMessage(member);
		} else {
			out[key] = maskInfo(member);
		}
	}
	return out;
}
