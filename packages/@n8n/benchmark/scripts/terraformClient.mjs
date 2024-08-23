// @ts-check

import path from 'path';
import { $, fs } from 'zx';

const paths = {
	infraCodeDir: path.resolve('infra'),
	terraformStateFile: path.join(path.resolve('infra'), 'terraform.tfstate'),
};

export class TerraformClient {
	constructor({ privateKeyPath, isVerbose = false }) {
		this.privateKeyPath = privateKeyPath;
		this.isVerbose = isVerbose;
		this.$$ = $({
			cwd: paths.infraCodeDir,
			verbose: isVerbose,
		});
	}

	/**
	 * @typedef {Object} BenchmarkEnv
	 * @property {string} vmName
	 *
	 * @returns {Promise<BenchmarkEnv>}
	 */
	async provisionEnvironment() {
		console.log('Provisioning cloud environment...');

		await this.$$`terraform init`;
		await this.$$`terraform apply -input=false -auto-approve`;

		return {
			vmName: await this.getTerraformOutput('vm_name'),
		};
	}

	async destroyEnvironment() {
		if (!fs.existsSync(paths.terraformStateFile)) {
			console.log('No cloud environment to destroy. Skipping...');
			return;
		}

		console.log('Destroying cloud environment...');

		await this.$$`terraform destroy -input=false -auto-approve`;
	}

	async getTerraformOutput(key) {
		const output = await this.$$`terraform output -raw ${key}`;
		return output.stdout.trim();
	}
}
