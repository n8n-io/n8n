import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
	appendFileSync,
	lstatSync,
	readFileSync,
	readdirSync,
	readlinkSync,
	rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function hashTree(hash, path, name = path) {
	const stat = lstatSync(path);
	hash.update(JSON.stringify([name, stat.mode & 0o777]));
	if (stat.isSymbolicLink()) {
		hash.update(JSON.stringify(['link', readlinkSync(path)]));
	} else if (stat.isDirectory()) {
		for (const child of readdirSync(path).sort()) {
			hashTree(hash, join(path, child), `${name}/${child}`);
		}
	} else if (stat.isFile()) {
		hash.update(JSON.stringify(['file', stat.size]));
		hash.update(readFileSync(path));
	} else {
		throw new Error(`Unsupported runner input: ${path}`);
	}
}

export function externalBases(dockerfile, args) {
	const stages = new Set();
	const bases = new Set();
	for (const line of dockerfile.split('\n')) {
		const arg = line.match(/^ARG (\w+)=(.+)$/);
		if (arg && args[arg[1]] === undefined) args[arg[1]] = arg[2];
		const from = line.match(/^FROM (\S+)(?: AS (\S+))?/i);
		if (!from) continue;
		const ref = from[1].replace(/\$\{(\w+)\}/g, (_, key) => {
			if (args[key] === undefined) throw new Error(`Missing build argument: ${key}`);
			return args[key];
		});
		if (!stages.has(ref)) bases.add(ref);
		if (from[2]) stages.add(from[2]);
	}
	return [...bases].sort();
}

function main() {
	// Build timings are diagnostics, not runner code. Keep them outside the image input.
	rmSync('dist/task-runner-javascript/build-manifest.json', { force: true });
	// The Dockerfile also removes pnpm's timestamped deployment state before installation.
	rmSync('dist/task-runner-javascript/node_modules/.modules.yaml', { force: true });
	const dockerfilePath = 'docker/images/runners/Dockerfile.distroless';
	const plan = JSON.parse(
		execFileSync(
			'docker',
			['buildx', 'bake', '-f', 'docker/docker-bake.hcl', 'runners-distroless', '--print'],
			{ encoding: 'utf8' },
		),
	);
	const { N8N_VERSION: _version, ...args } = plan.target['runners-distroless'].args;
	const bases = externalBases(readFileSync(dockerfilePath, 'utf8'), { ...args });
	const resolvedBases = bases.map((ref) => ({
		ref,
		manifest: execFileSync('docker', ['buildx', 'imagetools', 'inspect', ref, '--raw'], {
			encoding: 'utf8',
		}),
	}));
	const hash = createHash('sha256');
	// Refresh daily because package-manager steps also use external repositories.
	hash.update(
		JSON.stringify({
			format: 1,
			platform: process.env.PLATFORMS,
			day: new Date().toISOString().slice(0, 10),
			args,
			resolvedBases,
		}),
	);
	for (const path of [
		'dist/task-runner-javascript',
		'packages/@n8n/task-runner-python',
		dockerfilePath,
		'docker/images/runners/n8n-task-runners.json',
		'.dockerignore',
		'.github/scripts/docker/runner-image-fingerprint.mjs',
	])
		hashTree(hash, path);
	const fingerprint = hash.digest('hex');
	const image = `ghcr.io/n8n-io/runners:ci-reuse-distroless-${fingerprint}`;
	appendFileSync(process.env.GITHUB_OUTPUT, `image=${image}\nfingerprint=${fingerprint}\n`);
	console.log(`Runner input fingerprint: ${fingerprint}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
