#!/usr/bin/env node

import { appendFileSync } from 'node:fs';

class BuildContext {
	constructor() {
		this.githubOutput = process.env.GITHUB_OUTPUT || null;
	}

	determine({ event, pr, branch, version, releaseType, pushEnabled }) {
		let context = {
			version: '',
			release_type: '',
			platforms: ['linux/amd64', 'linux/arm64'],
			push_to_ghcr: true,
			push_to_docker: false,
		};

		if (version && releaseType) {
			context.version = version;
			context.release_type = releaseType;
			context.push_to_docker = true;
		} else {
			switch (event) {
				case 'schedule':
					context.version = 'nightly';
					context.release_type = 'nightly';
					context.push_to_docker = true;
					break;

				case 'pull_request':
					context.version = `pr-${pr}`;
					context.release_type = 'dev';
					context.platforms = ['linux/amd64'];
					break;

				case 'workflow_dispatch':
					context.version = `branch-${this.sanitizeBranch(branch)}`;
					context.release_type = 'branch';
					context.platforms = ['linux/amd64'];
					break;

				case 'push':
					if (branch === 'master') {
						context.version = 'dev';
						context.release_type = 'dev';
						context.push_to_docker = true;
					} else {
						context.version = `branch-${this.sanitizeBranch(branch)}`;
						context.release_type = 'branch';
						context.platforms = ['linux/amd64'];
					}
					break;

				case 'workflow_call':
				case 'release':
					if (!version) throw new Error('Version required for release');
					context.version = version;
					context.release_type = releaseType || 'stable';
					context.push_to_docker = true;
					break;

				default:
					throw new Error(`Unknown event: ${event}`);
			}
		}

		// Handle push_enabled override
		if (pushEnabled !== undefined) {
			context.push_enabled = pushEnabled;
		} else {
			context.push_enabled = context.push_to_ghcr;
		}

		return context;
	}

	sanitizeBranch(branch) {
		if (!branch) return 'unknown';
		return branch
			.toLowerCase()
			.replace(/[^a-z0-9._-]/g, '-')
			.replace(/^[.-]/, '')
			.replace(/[.-]$/, '')
			.substring(0, 128);
	}

	buildMatrix(platforms) {
		const runners = {
			'linux/amd64': 'blacksmith-4vcpu-ubuntu-2204',
			'linux/arm64': 'blacksmith-4vcpu-ubuntu-2204-arm',
		};

		const matrix = {
			platform: [],
			include: [],
		};

		for (const platform of platforms) {
			const shortName = platform.split('/').pop(); // amd64 or arm64
			matrix.platform.push(shortName);
			matrix.include.push({
				platform: shortName,
				runner: runners[platform],
				docker_platform: platform,
			});
		}

		return matrix;
	}

	output(context, matrix = null) {
		const buildMatrix = matrix || this.buildMatrix(context.platforms);

		if (this.githubOutput) {
			const outputs = [
				`version=${context.version}`,
				`release_type=${context.release_type}`,
				`platforms=${JSON.stringify(context.platforms)}`,
				`push_to_ghcr=${context.push_to_ghcr}`,
				`push_to_docker=${context.push_to_docker}`,
				`push_enabled=${context.push_enabled}`,
				`build_matrix=${JSON.stringify(buildMatrix)}`,
			];
			appendFileSync(this.githubOutput, outputs.join('\n') + '\n');
		} else {
			console.log(JSON.stringify({ ...context, build_matrix: buildMatrix }, null, 2));
		}
	}
}

// CLI - Simple argument parsing
if (import.meta.url === `file://${process.argv[1]}`) {
	const args = process.argv.slice(2);
	const getArg = (name) => {
		const index = args.indexOf(`--${name}`);
		if (index === -1 || !args[index + 1]) return undefined;
		const value = args[index + 1];
		// Handle empty strings and 'null' as undefined
		return value === '' || value === 'null' ? undefined : value;
	};

	try {
		const context = new BuildContext();
		const pushEnabledArg = getArg('push-enabled');
		const result = context.determine({
			event: getArg('event') || process.env.GITHUB_EVENT_NAME,
			pr: getArg('pr') || process.env.GITHUB_PR_NUMBER,
			branch: getArg('branch') || process.env.GITHUB_REF_NAME,
			version: getArg('version'),
			releaseType: getArg('release-type'),
			pushEnabled:
				pushEnabledArg === 'true' ? true : pushEnabledArg === 'false' ? false : undefined,
		});

		const matrix = context.buildMatrix(result.platforms);

		// Debug output when GITHUB_OUTPUT is set (running in Actions)
		if (context.githubOutput) {
			console.log('=== Build Context ===');
			console.log(`version: ${result.version}`);
			console.log(`release_type: ${result.release_type}`);
			console.log(`platforms: ${JSON.stringify(result.platforms, null, 2)}`);
			console.log(`push_to_ghcr: ${result.push_to_ghcr}`);
			console.log(`push_to_docker: ${result.push_to_docker}`);
			console.log(`push_enabled: ${result.push_enabled}`);
			console.log('build_matrix:', JSON.stringify(matrix, null, 2));
		}

		context.output(result, matrix);
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
}

export default BuildContext;
