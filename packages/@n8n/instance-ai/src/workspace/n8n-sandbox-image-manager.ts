import { N8nSandboxClient } from './n8n-sandbox-client';
import type { N8nSandboxInstantiatedImage } from './n8n-sandbox-client';
import { BUILD_MJS, PACKAGE_JSON, TSCONFIG_JSON } from './sandbox-setup';

function b64(content: string): string {
	return Buffer.from(content, 'utf-8').toString('base64');
}

export class N8nSandboxImageManager {
	private readonly client: N8nSandboxClient;

	private cachedImage: N8nSandboxInstantiatedImage | null = null;

	constructor(config: { serviceUrl?: string; apiKey?: string }) {
		this.client = new N8nSandboxClient({
			baseUrl: config.serviceUrl,
			apiKey: config.apiKey,
		});
	}

	ensureImage(): N8nSandboxInstantiatedImage {
		if (this.cachedImage) return this.cachedImage;

		this.cachedImage = this.client.instantiateImage([
			'mkdir -p /home/user/workspace/src /home/user/workspace/chunks /home/user/workspace/node-types',
			`echo '${b64(PACKAGE_JSON)}' | base64 -d > /home/user/workspace/package.json`,
			`echo '${b64(TSCONFIG_JSON)}' | base64 -d > /home/user/workspace/tsconfig.json`,
			`echo '${b64(BUILD_MJS)}' | base64 -d > /home/user/workspace/build.mjs`,
			'cd /home/user/workspace && npm install --ignore-scripts',
		]);

		return this.cachedImage;
	}

	invalidate(): void {
		this.cachedImage = null;
	}
}
