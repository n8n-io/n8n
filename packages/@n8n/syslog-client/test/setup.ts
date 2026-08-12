import * as dgram from 'dgram';
import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';
import * as readline from 'readline';
import * as tls from 'tls';

// Test ports - dynamically assigned by getAvailablePort
export let SYSLOG_UDP_PORT = 0;
export let SYSLOG_TCP_PORT = 0;
export let SYSLOG_TLS_PORT = 0;

/**
 * Get an available port by creating and immediately closing a server.
 */
const getAvailablePort = async (): Promise<number> =>
	await new Promise((resolve, reject) => {
		const server = net.createServer();
		server.unref();
		server.on('error', reject);
		server.listen(0, () => {
			const address = server.address();
			if (!address || typeof address === 'string') {
				server.close();
				return reject(new Error('Unable to get port'));
			}
			const { port } = address;
			server.close(() => resolve(port));
		});
	});

// Test certificates
export const TLS_PRIVATE_KEY = fs.readFileSync(path.join(__dirname, 'fixtures', 'key.pem'), 'utf8');
export const TLS_CERTIFICATE = fs.readFileSync(
	path.join(__dirname, 'fixtures', 'certificate.pem'),
	'utf8',
);
export const WRONG_CERTIFICATE = fs.readFileSync(
	path.join(__dirname, 'fixtures', 'wrong.pem'),
	'utf8',
);

// Message queues
const queuedUdpMessages: string[] = [];
const pendingUdpResolvers: Array<(msg: string) => void> = [];
const queuedTcpMessages: string[] = [];
const pendingTcpResolvers: Array<(msg: string) => void> = [];
const queuedTlsMessages: string[] = [];
const pendingTlsResolvers: Array<(msg: string) => void> = [];

// Test servers
let udpServer: dgram.Socket | null = null;
let tcpServer: net.Server | null = null;
let tlsServer: tls.Server | null = null;

/**
 * Helper to await syslog messages from UDP server.
 */
export const awaitUdpMsg = async (): Promise<string> =>
	await new Promise((resolve) => {
		const queued = queuedUdpMessages.shift();
		if (queued) return resolve(queued);
		pendingUdpResolvers.push(resolve);
	});

/**
 * Helper to await syslog messages from TCP server.
 */
export const awaitTcpMsg = async (): Promise<string> =>
	await new Promise((resolve) => {
		const queued = queuedTcpMessages.shift();
		if (queued) return resolve(queued);
		pendingTcpResolvers.push(resolve);
	});

/**
 * Helper to await syslog messages from TLS server.
 */
export const awaitTlsMsg = async (): Promise<string> =>
	await new Promise((resolve) => {
		const queued = queuedTlsMessages.shift();
		if (queued) return resolve(queued);
		pendingTlsResolvers.push(resolve);
	});

/**
 * Escape special regex characters.
 */
const escapeRegExp = (text: string): string => text.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');

/**
 * Construct regex to match RFC 3164 syslog message.
 */
export const constructSyslogRegex = (
	pri: number,
	hostname: string,
	msg: string,
	timestamp?: Date,
): RegExp => {
	let patDate: string;
	if (!timestamp) {
		// RFC-3164 date format: "MMM dd HH:mm:ss"
		// Month is 3 letters, day is space-padded, time is in 24-hour format
		patDate = '[A-Z][a-z]{2}\\s{1,2}\\d{1,2}\\s\\d{2}:\\d{2}:\\d{2}';
	} else {
		const elements = timestamp.toString().split(/\s+/);
		const month = elements[1];
		let day = elements[2];
		const time = elements[4];

		// Ensure day is space-padded for single digits as per RFC-3164
		if (day.length === 2 && day[0] === '0') {
			day = ' ' + day.substring(1);
		}

		patDate = escapeRegExp(`${month} ${day} ${time}`);
	}

	// RFC-3164 format: <PRI>TIMESTAMP HOSTNAME MSG
	// - PRI is enclosed in angle brackets
	// - Single space between timestamp and hostname
	// - Single space between hostname and message
	// - Optional newline at the end
	return new RegExp(
		`^<${escapeRegExp(String(pri))}>${patDate}\\s${escapeRegExp(hostname)}\\s${escapeRegExp(msg)}\\n?$`,
	);
};
/**
 * Construct regex to match RFC 5424 syslog message.
 */
export const constructRfc5424Regex = (
	pri: number,
	hostname: string,
	msg: string,
	msgid: string | number,
	timestamp?: Date,
): RegExp => {
	const patDate = !timestamp
		? '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z'
		: escapeRegExp(timestamp.toISOString());

	return new RegExp(
		`^<${escapeRegExp(String(pri))}>\\d+ ${patDate} ${escapeRegExp(hostname)} \\S{1,48} \\d+ ${escapeRegExp(String(msgid))} - ${escapeRegExp(msg)}\\n?$`,
	);
};

/**
 * Start test syslog servers (UDP, TCP, TLS).
 */
export const startTestServers = async (): Promise<void> => {
	// Get available ports
	SYSLOG_UDP_PORT = await getAvailablePort();
	SYSLOG_TCP_PORT = await getAvailablePort();
	SYSLOG_TLS_PORT = await getAvailablePort();

	// Setup UDP server
	await new Promise<void>((resolve) => {
		udpServer = dgram.createSocket('udp4');
		udpServer.on('message', (msg) => {
			const resolver = pendingUdpResolvers.shift();
			if (resolver) return resolver(msg.toString());
			queuedUdpMessages.push(msg.toString());
		});
		udpServer.on('listening', () => {
			console.log(`Started UDP syslog server on port ${SYSLOG_UDP_PORT}`);
			resolve();
		});
		udpServer.bind(SYSLOG_UDP_PORT);
	});

	// Setup TCP server
	await new Promise<void>((resolve) => {
		tcpServer = net.createServer((socket) => {
			const lines = readline.createInterface({ input: socket, output: socket });
			lines.on('line', (line) => {
				const resolver = pendingTcpResolvers.shift();
				if (resolver) return resolver(line);
				queuedTcpMessages.push(line);
			});
		});
		tcpServer.listen(SYSLOG_TCP_PORT, () => {
			console.log(`Started TCP syslog server on port ${SYSLOG_TCP_PORT}`);
			resolve();
		});
	});

	// Setup TLS server
	await new Promise<void>((resolve) => {
		tlsServer = tls.createServer(
			{
				key: TLS_PRIVATE_KEY,
				cert: TLS_CERTIFICATE,
				secureProtocol: 'TLSv1_2_method',
			},
			(socket) => {
				const lines = readline.createInterface({ input: socket, output: socket });
				lines.on('line', (line) => {
					const resolver = pendingTlsResolvers.shift();
					if (resolver) return resolver(line);
					queuedTlsMessages.push(line);
				});
			},
		);
		tlsServer.listen(SYSLOG_TLS_PORT, () => {
			console.log(`Started TLS syslog server on port ${SYSLOG_TLS_PORT}`);
			resolve();
		});
	});
};

/**
 * Stop test syslog servers.
 */
export const stopTestServers = (): void => {
	udpServer?.close();
	tcpServer?.close();
	tlsServer?.close();
	udpServer = null;
	tcpServer = null;
	tlsServer = null;
};
