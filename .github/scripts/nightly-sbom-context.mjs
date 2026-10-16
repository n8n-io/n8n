#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const POLL_ATTEMPTS = 25;

function writeOutput(name, value) {
	if (!process.env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT is not set.');
	appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function getLatestScheduledRun() {
	const output = execFileSync(
		'gh',
		[
			'run',
			'list',
			'--repo',
			process.env.GITHUB_REPOSITORY,
			'--workflow',
			'docker-build-push.yml',
			'--event',
			'schedule',
			'--limit',
			'1',
			'--json',
			'conclusion,createdAt,headSha,status',
		],
		{ encoding: 'utf8' },
	);
	return JSON.parse(output)[0];
}

function isFullSha(value) {
	return /^[0-9a-f]{40}$/.test(value ?? '');
}

async function resolveSource() {
	if (process.env.GITHUB_EVENT_NAME === 'workflow_dispatch') {
		if (!isFullSha(process.env.GITHUB_SHA)) throw new Error('GITHUB_SHA is not a full commit SHA.');
		writeOutput('source_sha', process.env.GITHUB_SHA);
		return;
	}

	for (let attempt = 1; attempt <= POLL_ATTEMPTS; attempt++) {
		const run = getLatestScheduledRun();
		const age = run?.createdAt ? Date.now() - Date.parse(run.createdAt) : MAX_AGE_MS + 1;
		const isCurrent = age >= 0 && age <= MAX_AGE_MS;

		if (
			run?.status === 'completed' &&
			run.conclusion === 'success' &&
			isFullSha(run.headSha) &&
			isCurrent
		) {
			writeOutput('source_sha', run.headSha);
			return;
		}

		if (run?.status === 'completed' && run.createdAt && isCurrent) {
			throw new Error(
				`The current scheduled Docker build completed with conclusion '${run.conclusion}'.`,
			);
		}

		if (attempt < POLL_ATTEMPTS) {
			console.log(
				`Waiting for the current scheduled Docker build (attempt ${attempt} of ${POLL_ATTEMPTS}).`,
			);
			await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
		}
	}

	throw new Error('No successful scheduled Docker build appeared within two hours.');
}

function resolveImageTag() {
	if (process.env.GITHUB_EVENT_NAME === 'workflow_dispatch') {
		writeOutput('image_tag', 'nightly');
		return;
	}

	const shortSha = execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
		encoding: 'utf8',
	}).trim();
	writeOutput('image_tag', `nightly-${shortSha}`);
}

const command = process.argv[2];

try {
	if (command === 'resolve-source') {
		await resolveSource();
	} else if (command === 'resolve-image-tag') {
		resolveImageTag();
	} else {
		throw new Error('Expected resolve-source or resolve-image-tag.');
	}
} catch (error) {
	console.error(`::error::${error.message}`);
	process.exit(1);
}
