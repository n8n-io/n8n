import fs from 'fs';
import net from 'net';
import path from 'path';
import tls from 'tls';

const CRLF = '\r\n';

/**
 * Just enough IMAP to drive imapflow from greeting to SELECT/IDLE, with a
 * switch to stop answering while leaving the socket open — the state a
 * middlebox or a wedged server leaves behind.
 */
export class FakeImapServer {
	private readonly server: net.Server;

	private readonly sockets = new Set<net.Socket>();

	readonly received: string[] = [];

	/** When true the server reads but never writes. */
	silent = false;

	/** When true the server accepts IDLE but never sends the `+` continuation that confirms it. */
	withholdIdleContinuation = false;

	/** Close the socket without a response to the first CAPABILITY command. */
	disconnectOnCapability = false;

	/** Messages the mailbox reports on SELECT. */
	exists = 0;

	/**
	 * Advertise IMAP4rev2 and, once a client enables it, answer every SEARCH with an ESEARCH
	 * that leaves out ALL, as STRATO's RZimapd does. The mailbox holds unseen UID 1.
	 */
	brokenRev2Search = false;

	constructor(secure: boolean) {
		const handler = (socket: net.Socket) => {
			this.sockets.add(socket);
			socket.on('close', () => this.sockets.delete(socket));
			socket.on('error', () => {});

			let idleTag: string | undefined;
			let rev2 = false;
			const write = (line: string) => {
				if (!this.silent) socket.write(line + CRLF);
			};

			write('* OK fake IMAP ready');

			let buffered = '';
			socket.on('data', (chunk) => {
				buffered += chunk.toString();
				const lines = buffered.split(CRLF);
				buffered = lines.pop() ?? '';

				for (const line of lines) {
					this.received.push(line);

					if (line === 'DONE') {
						write(`${idleTag} OK IDLE terminated`);
						idleTag = undefined;
						continue;
					}

					const [tag, command, subcommand] = line.split(' ');
					const verb = (command ?? '').toUpperCase();
					const uidVerb = verb === 'UID' ? (subcommand ?? '').toUpperCase() : undefined;

					if (verb === 'CAPABILITY') {
						if (this.disconnectOnCapability) {
							socket.destroy();
							continue;
						}

						write(
							this.brokenRev2Search
								? '* CAPABILITY IMAP4rev1 IMAP4rev2 ENABLE IDLE'
								: '* CAPABILITY IMAP4rev1 IDLE',
						);
					} else if (verb === 'ENABLE') {
						rev2 = this.brokenRev2Search && /IMAP4rev2/i.test(line);
						if (rev2) write('* ENABLED IMAP4rev2');
					} else if (uidVerb === 'SEARCH') {
						write(rev2 ? `* ESEARCH (TAG "${tag}") UID` : '* SEARCH 1');
					} else if (uidVerb === 'FETCH') {
						write('* 1 FETCH (UID 1 FLAGS ())');
					} else if (verb === 'LIST') {
						write('* LIST (\\Noselect) "/" ""');
					} else if (verb === 'SELECT' || verb === 'EXAMINE') {
						write(`* ${this.exists} EXISTS`);
						write('* 0 RECENT');
						write('* FLAGS (\\Seen)');
						write('* OK [UIDVALIDITY 1] UIDs valid');
						write('* OK [UIDNEXT 1] Predicted next UID');
						write(`${tag} OK [READ-WRITE] SELECT completed`);
						continue;
					} else if (verb === 'IDLE') {
						idleTag = tag;
						if (!this.withholdIdleContinuation) write('+ idling');
						continue;
					}

					write(`${tag} OK ${verb} completed`);
				}
			});
		};

		this.server = secure
			? tls.createServer(
					{
						key: fs.readFileSync(path.join(__dirname, 'fixtures', 'key.pem')),
						cert: fs.readFileSync(path.join(__dirname, 'fixtures', 'certificate.pem')),
					},
					handler,
				)
			: net.createServer(handler);
	}

	/** Unsolicited server data, as a real server sends during IDLE. */
	pushUntagged(line: string) {
		for (const socket of this.sockets) socket.write(line + CRLF);
	}

	async listen(): Promise<number> {
		await new Promise<void>((resolve) => this.server.listen(0, '127.0.0.1', resolve));
		return (this.server.address() as net.AddressInfo).port;
	}

	async close() {
		for (const socket of this.sockets) socket.destroy();
		await new Promise<void>((resolve) => this.server.close(() => resolve()));
	}
}
