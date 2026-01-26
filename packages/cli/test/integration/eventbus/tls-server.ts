import * as tls from 'tls';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export class TlsSyslogServer {
	private server: tls.Server | null = null;
	private messages: string[] = [];
	port: number = 0;

	async start(): Promise<number> {
		const key = fs.readFileSync(path.join(__dirname, 'support', 'key.pem'), 'utf8');
		const cert = fs.readFileSync(path.join(__dirname, 'support', 'certificate.pem'), 'utf8');

		return await new Promise((resolve) => {
			this.server = tls.createServer({ key, cert, secureProtocol: 'TLSv1_2_method' }, (socket) => {
				const lines = readline.createInterface({ input: socket });
				lines.on('line', (line) => {
					this.messages.push(line);
					console.log('Received:', line);
				});
			});

			this.server.listen(0, () => {
				const address = this.server!.address();
				this.port = address && typeof address === 'object' ? address.port : 0;
				console.log(`TLS Syslog server listening on port ${this.port}`);
				resolve(this.port);
			});
		});
	}

	async stop(): Promise<void> {
		return await new Promise((resolve) => {
			this.server?.close();
			resolve();
		});
	}

	getMessages(): string[] {
		return [...this.messages];
	}

	clearMessages(): void {
		this.messages = [];
	}

	async waitForMessage(timeout = 5000): Promise<string> {
		const start = Date.now();
		while (Date.now() - start < timeout) {
			if (this.messages.length > 0) {
				return this.messages.shift()!;
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		throw new Error('Timeout waiting for message');
	}
}
