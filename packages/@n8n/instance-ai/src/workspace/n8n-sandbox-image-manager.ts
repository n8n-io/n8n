import { DockerfileStepsBuilder } from './n8n-sandbox-client';
import {
	BUILD_MJS,
	N8N_SANDBOX_WORKSPACE_ROOT,
	PACKAGE_JSON,
	TSCONFIG_JSON,
} from './sandbox-setup';

function b64(content: string): string {
	return Buffer.from(content, 'utf-8').toString('base64');
}

const ROOT = N8N_SANDBOX_WORKSPACE_ROOT;

export class N8nSandboxImageManager {
	private cachedDockerfile: DockerfileStepsBuilder | null = null;

	getDockerfile(): DockerfileStepsBuilder {
		if (this.cachedDockerfile) return this.cachedDockerfile;

		this.cachedDockerfile = new DockerfileStepsBuilder()
			.run(`mkdir -p ${ROOT}/src ${ROOT}/chunks ${ROOT}/node-types`)
			.run(`echo '${b64(PACKAGE_JSON)}' | base64 -d > ${ROOT}/package.json`)
			.run(`echo '${b64(TSCONFIG_JSON)}' | base64 -d > ${ROOT}/tsconfig.json`)
			.run(`echo '${b64(BUILD_MJS)}' | base64 -d > ${ROOT}/build.mjs`)
			.run(`cd ${ROOT} && npm install --ignore-scripts`);

		return this.cachedDockerfile;
	}
}
