// @ts-check
import { $ } from 'zx';

export class SshClient {
	/**
	 *
	 * @param {{ privateKeyPath: string; ip: string; username: string; verbose?: boolean }} param0
	 */
	constructor({ privateKeyPath, ip, username, verbose = false }) {
		this.verbose = verbose;
		this.privateKeyPath = privateKeyPath;
		this.ip = ip;
		this.username = username;

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

		const target = `${this.username}@${this.ip}`;

		await $$`ssh -i ${this.privateKeyPath} -o StrictHostKeyChecking=accept-new ${target} ${command}`;
	}

	async scp(source, destination) {
		const target = `${this.username}@${this.ip}:${destination}`;
		await this
			.$$`scp -i ${this.privateKeyPath} -o StrictHostKeyChecking=accept-new ${source} ${target}`;
	}
}
