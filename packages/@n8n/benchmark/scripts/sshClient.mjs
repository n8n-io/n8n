// @ts-check
import { $ } from 'zx';

export class SshClient {
	/**
	 *
	 * @param {{ vmName: string; resourceGroupName: string; verbose?: boolean }} param0
	 */
	constructor({ vmName, resourceGroupName, verbose = false }) {
		this.vmName = vmName;
		this.resourceGroupName = resourceGroupName;
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

		await $$`az ssh vm -n ${this.vmName} -g ${this.resourceGroupName} --yes -- -o StrictHostKeyChecking=accept-new ${command}`;
	}
}
