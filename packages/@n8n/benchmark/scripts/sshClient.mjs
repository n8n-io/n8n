// @ts-check
import { $ } from 'zx';

export class SshClient {
	constructor({ hostname, username, privateKeyPath, verbose = false }) {
		this.hostname = hostname;
		this.username = username;
		this.privateKeyPath = privateKeyPath;
		this.verbose = verbose;

		this.$$ = $({
			verbose,
		});
	}

	/**
	 * @param {string} command
	 * @param {{ verbose?: boolean }} [options]
	 */
	async ssh(command, options = {}) {
		const $$ = options?.verbose ? $({ verbose: true }) : this.$$;

		await $$`ssh -o StrictHostKeyChecking=accept-new -i ${this.privateKeyPath} ${this.username}@${this.hostname} ${command}`;
	}

	/**
	 * @param {string} localPath
	 * @param {string} remotePath
	 */
	async scp(localPath, remotePath) {
		const source = localPath;
		const target = `${this.username}@${this.hostname}:${remotePath}`;

		await this.$$`scp -i ${this.privateKeyPath} ${source} ${target}`;
	}
}
