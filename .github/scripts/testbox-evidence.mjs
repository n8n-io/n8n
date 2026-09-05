#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
	createReadStream,
	existsSync,
	lstatSync,
	mkdirSync,
	readFileSync,
	readlinkSync,
	writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

function fail(message) {
	console.error(`testbox-evidence: ${message}`);
	process.exit(2);
}

function parseArguments(argv) {
	const separator = argv.indexOf('--');
	if (separator === -1 || separator === argv.length - 1) {
		fail(
			'use --node <id> [--base <ref>] [--workflow <path>] [--output <path>] [--artifact <path>] -- <command>',
		);
	}

	const options = {
		node: '',
		base: process.env.TESTBOX_EVIDENCE_BASE_SHA ?? '',
		workflow: process.env.TESTBOX_EVIDENCE_WORKFLOW ?? '',
		output: '',
		artifacts: [],
	};

	for (let index = 0; index < separator; index += 2) {
		const flag = argv[index];
		const value = argv[index + 1];
		if (!value) fail(`missing value for ${flag}`);

		switch (flag) {
			case '--node':
				options.node = value;
				break;
			case '--base':
				options.base = value;
				break;
			case '--workflow':
				options.workflow = value;
				break;
			case '--output':
				options.output = value;
				break;
			case '--artifact':
				options.artifacts.push(value);
				break;
			default:
				fail(`unknown option ${flag}`);
		}
	}

	if (!options.node) fail('--node is required');
	if (!/^[A-Za-z0-9._:-]+$/.test(options.node)) fail('--node contains unsupported characters');

	options.output ||= `/tmp/testbox-evidence/${options.node.replaceAll(':', '-')}.json`;
	return { options, command: argv.slice(separator + 1) };
}

function git(...args) {
	const result = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
	if (result.status !== 0) fail(result.stderr.trim() || `git ${args.join(' ')} failed`);
	return result.stdout.trim();
}

async function hashFile(path, hash) {
	await new Promise((resolveStream, reject) => {
		const stream = createReadStream(path);
		stream.on('data', (chunk) => hash.update(chunk));
		stream.on('end', resolveStream);
		stream.on('error', reject);
	});
}

async function workspaceDigest() {
	const files = git('ls-files', '--cached', '--others', '--exclude-standard', '-z')
		.split('\0')
		.filter(Boolean)
		.sort();
	const hash = createHash('sha256');

	for (const file of files) {
		if (!existsSync(file)) continue;
		const stat = lstatSync(file);
		const mode = stat.isSymbolicLink() ? 'symlink' : stat.mode & 0o111 ? 'executable' : 'file';
		hash.update(`${file}\0${mode}\0${stat.size}\0`);
		if (stat.isSymbolicLink()) hash.update(readlinkSync(file));
		else await hashFile(file, hash);
		hash.update('\0');
	}

	return `sha256:${hash.digest('hex')}`;
}

function sha256(value) {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function optionalFile(path) {
	try {
		return readFileSync(path, 'utf8').trim();
	} catch {
		return null;
	}
}

async function artifactEvidence(paths) {
	const artifacts = [];
	for (const path of paths) {
		if (!existsSync(path)) fail(`artifact does not exist: ${path}`);
		const stat = lstatSync(path);
		if (!stat.isFile()) fail(`artifact must be a file: ${path}`);
		const hash = createHash('sha256');
		await hashFile(path, hash);
		artifacts.push({ path, size: stat.size, digest: `sha256:${hash.digest('hex')}` });
	}
	return artifacts;
}

function run(command) {
	return new Promise((resolveRun, reject) => {
		const stdoutHash = createHash('sha256');
		const stderrHash = createHash('sha256');
		const child = spawn(command[0], command.slice(1), {
			env: process.env,
			stdio: ['inherit', 'pipe', 'pipe'],
		});

		child.stdout.on('data', (chunk) => {
			stdoutHash.update(chunk);
			process.stdout.write(chunk);
		});
		child.stderr.on('data', (chunk) => {
			stderrHash.update(chunk);
			process.stderr.write(chunk);
		});
		child.on('error', reject);
		child.on('close', (code, signal) => {
			resolveRun({
				exitCode: code ?? 1,
				signal,
				stdoutDigest: `sha256:${stdoutHash.digest('hex')}`,
				stderrDigest: `sha256:${stderrHash.digest('hex')}`,
			});
		});
	});
}

const { options, command } = parseArguments(process.argv.slice(2));
const startedAt = new Date().toISOString();
const headSha = git('rev-parse', 'HEAD');
const sourceDigest = await workspaceDigest();
const workflowPath = options.workflow || '.github/workflows/testbox-evidence-spike.yml';
if (!existsSync(workflowPath)) fail(`workflow does not exist: ${workflowPath}`);
const workflowDigest = sha256(readFileSync(workflowPath));
const commandDigest = sha256(JSON.stringify(command));
const hydratedPath = optionalFile('/tmp/.testbox/path');
if (hydratedPath) process.env.PATH = hydratedPath;

let result;
try {
	result = await run(command);
} catch (error) {
	result = {
		exitCode: 1,
		signal: null,
		stdoutDigest: null,
		stderrDigest: null,
		spawnError: error instanceof Error ? error.message : String(error),
	};
}

const evidence = {
	schemaVersion: 1,
	kind: 'n8n.testbox.evidence',
	subject: {
		repository: process.env.GITHUB_REPOSITORY ?? git('config', '--get', 'remote.origin.url'),
		headSha,
		baseSha: options.base || null,
		workspaceDigest: sourceDigest,
	},
	node: {
		id: options.node,
		command,
		commandDigest,
		workflowPath,
		workflowDigest,
	},
	environment: {
		testboxId: optionalFile('/tmp/.testbox/testbox_id'),
		githubRunId: process.env.GITHUB_RUN_ID ?? optionalFile('/tmp/.testbox/adopted_run_id'),
		githubJob: process.env.GITHUB_JOB ?? null,
		runnerName: process.env.RUNNER_NAME ?? null,
		runnerOs: process.env.RUNNER_OS ?? process.platform,
		runnerArch: process.env.RUNNER_ARCH ?? process.arch,
		nodeVersion: process.version,
	},
	result: {
		...result,
		status: result.exitCode === 0 ? 'passed' : 'failed',
		startedAt,
		completedAt: new Date().toISOString(),
	},
	artifacts: await artifactEvidence(options.artifacts),
	attestation: {
		status: 'unsigned',
		reason: 'The command ran inside an agent-controlled Testbox.',
	},
};

const output = resolve(options.output);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`\nTESTBOX_EVIDENCE_FILE=${output}`);
console.log(`TESTBOX_EVIDENCE_NODE=${options.node}`);
console.log(`TESTBOX_EVIDENCE_STATUS=${evidence.result.status}`);
console.log(`TESTBOX_EVIDENCE_DIGEST=${sha256(readFileSync(output))}`);

process.exitCode = result.exitCode;
