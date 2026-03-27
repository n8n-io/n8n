import { DockerfileStepsBuilder } from './n8n-sandbox-client';
import { BUILD_MJS, PACKAGE_JSON, TSCONFIG_JSON } from './sandbox-setup';

function b64(content: string): string {
	return Buffer.from(content, 'utf-8').toString('base64');
}

export class N8nSandboxImageManager {
	private cachedDockerfile: DockerfileStepsBuilder | null = null;

	getDockerfile(): DockerfileStepsBuilder {
		if (this.cachedDockerfile) return this.cachedDockerfile;

		this.cachedDockerfile = new DockerfileStepsBuilder()
			.run(
				'mkdir -p /home/user/workspace/src /home/user/workspace/chunks /home/user/workspace/node-types',
			)
			.run(`echo '${b64(PACKAGE_JSON)}' | base64 -d > /home/user/workspace/package.json`)
			.run(`echo '${b64(TSCONFIG_JSON)}' | base64 -d > /home/user/workspace/tsconfig.json`)
			.run(`echo '${b64(BUILD_MJS)}' | base64 -d > /home/user/workspace/build.mjs`)
			.run('cd /home/user/workspace && npm install --ignore-scripts');

		return this.cachedDockerfile;
	}
}
