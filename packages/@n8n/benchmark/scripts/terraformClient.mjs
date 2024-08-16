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

	async provisionEnvironment() {
		console.log('Provisioning cloud environment...');

		await this.$$`terraform init`;
		await this.$$`terraform apply -input=false -auto-approve`;

		await this
			.$$`terraform output -raw ssh_private_key > ${this.privateKeyPath} && chmod 600 ${this.privateKeyPath}`;

		const getIpOutput = await this.$$`terraform output -raw vm_public_ip`;
		const ip = getIpOutput.stdout.trim();

		return {
			ip,
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
}
