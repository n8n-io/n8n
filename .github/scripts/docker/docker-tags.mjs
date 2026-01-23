#!/usr/bin/env node

import { appendFileSync } from 'node:fs';

class TagGenerator {
	constructor() {
		this.githubOwner = process.env.GITHUB_REPOSITORY_OWNER || 'n8n-io';
		this.dockerUsername = process.env.DOCKER_USERNAME || 'n8nio';
		this.githubOutput = process.env.GITHUB_OUTPUT || null;
	}

	generate({ image, version, platform, includeDockerHub = false }) {
		let imageName = image;
		let versionSuffix = '';

		if (image === 'runners-distroless') {
			imageName = 'runners';
			versionSuffix = '-distroless';
		}

		const platformSuffix = platform ? `-${platform.split('/').pop()}` : '';
		const fullVersion = `${version}${versionSuffix}${platformSuffix}`;

		const tags = {
			ghcr: [`ghcr.io/${this.githubOwner}/${imageName}:${fullVersion}`],
			docker: includeDockerHub ? [`${this.dockerUsername}/${imageName}:${fullVersion}`] : [],
		};

		tags.all = [...tags.ghcr, ...tags.docker];
		return tags;
	}

	output(tags, prefix = '') {
		if (this.githubOutput) {
			const prefixStr = prefix ? `${prefix}_` : '';
			const primaryTag = tags.ghcr[0] ? tags.ghcr[0].replace(/-amd64$|-arm64$/, '') : '';
			const outputs = [
				`${prefixStr}tags=${tags.all.join(',')}`,
				`${prefixStr}ghcr_tag=${tags.ghcr[0] || ''}`,
				`${prefixStr}docker_tag=${tags.docker[0] || ''}`,
				`${prefixStr}primary_tag=${primaryTag}`,
			];
			appendFileSync(this.githubOutput, outputs.join('\n') + '\n');
		} else {
			console.log(JSON.stringify(tags, null, 2));
		}
	}

	generateAll({ version, platform, includeDockerHub = false }) {
		const images = ['n8n', 'runners', 'runners-distroless'];
		const results = {};

		for (const image of images) {
			const tags = this.generate({ image, version, platform, includeDockerHub });
			const prefix = image.replace('-distroless', '_distroless');
			results[prefix] = tags;

			if (this.githubOutput) {
				this.output(tags, prefix);
			}
		}

		return results;
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const args = process.argv.slice(2);
	const getArg = (name) => {
		const index = args.indexOf(`--${name}`);
		return index !== -1 && args[index + 1] ? args[index + 1] : undefined;
	};
	const hasFlag = (name) => args.includes(`--${name}`);

	try {
		const generator = new TagGenerator();
		const version = getArg('version');

		if (!version) {
			console.error('Error: --version is required');
			process.exit(1);
		}

		if (hasFlag('all')) {
			const results = generator.generateAll({
				version,
				platform: getArg('platform'),
				includeDockerHub: hasFlag('include-docker'),
			});
			if (!generator.githubOutput) {
				console.log(JSON.stringify(results, null, 2));
			}
		} else {
			const image = getArg('image');
			if (!image) {
				console.error('Error: Either --image or --all is required');
				process.exit(1);
			}
			const tags = generator.generate({
				image,
				version,
				platform: getArg('platform'),
				includeDockerHub: hasFlag('include-docker'),
			});
			generator.output(tags);
		}
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
}

export default TagGenerator;
