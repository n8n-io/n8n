import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

import { initGithub } from './github-helpers.mjs';

const FAILED = new Set(['failure', 'timed_out']);

function groupContext(headSha, headRef) {
	return {
		head_sha: headSha,
		head_ref: headRef,
		// The ref identifies one PR. It does not list every PR in the group.
		anchor_pr: Number(headRef?.match(/\/pr-(\d+)-/)?.[1]) || null,
	};
}

export function parseFailedTests(log) {
	const tests = [];
	for (const raw of log.split('\n')) {
		const line = raw
			.replace(/\u001b\[[0-9;]*m/g, '')
			.replace(/\\u001b\[[0-9;]*m/g, '')
			.replace(/^\d{4}-\d\d-\d\dT\S+\s+/, '')
			.trim();
		// Vitest prints this summary after the individual assertion output.
		const match = line.match(
			/^(?:.*?:)?\s*FAIL\s+(?:\|[^|]+\|\s+)?(\S+\.(?:test|spec)\.[cm]?[jt]sx?)(?:\s+\[[^\r\n]*\])?(?:\s+>\s*(.+))?$/,
		);
		if (match) tests.push({ file: match[1], name: match[2] ?? null, source: 'log' });
	}
	return [...new Map(tests.map((test) => [JSON.stringify(test), test])).values()];
}

export async function collectFailedRun(octokit, repository, run) {
	const errors = [];
	const jobs = await octokit
		.paginate(octokit.rest.actions.listJobsForWorkflowRunAttempt, {
			...repository,
			run_id: run.id,
			attempt_number: run.run_attempt,
			per_page: 100,
		})
		.catch((error) => {
			errors.push({ stage: 'list_jobs', error: error.message });
			return [];
		});
	const failedJobs = jobs.filter((job) => FAILED.has(job.conclusion));
	const artifacts = await octokit
		.paginate(octokit.rest.actions.listWorkflowRunArtifacts, {
			...repository,
			run_id: run.id,
			per_page: 100,
		})
		.catch((error) => {
			errors.push({ stage: 'list_artifacts', error: error.message });
			return [];
		});
	const reports = [];
	for (const artifact of artifacts) {
		if (!artifact.name.startsWith(`merge-queue-junit-${run.run_attempt}-`)) continue;
		try {
			if (artifact.expired || artifact.size_in_bytes > 40_000_000) {
				throw new Error('Report artifact is expired or exceeds the size limit');
			}
			const { data } = await octokit.rest.actions.downloadArtifact({
				...repository,
				artifact_id: artifact.id,
				archive_format: 'zip',
			});
			const parsed = JSON.parse(
				execFileSync('python3', [new URL('./merge-queue-junit.py', import.meta.url).pathname], {
					input: Buffer.from(data),
					encoding: 'utf8',
					maxBuffer: 10_000_000,
					timeout: 30_000,
					stdio: ['pipe', 'pipe', 'pipe'],
				}),
			);
			reports.push({ artifact_id: artifact.id, artifact_name: artifact.name, ...parsed });
		} catch (error) {
			errors.push({ artifact_id: artifact.id, error: error.message });
		}
	}

	const failures = [];
	for (const job of failedJobs) {
		let tests = reports
			.filter(
				(report) =>
					report.job_name &&
					(job.name === report.job_name || job.name.endsWith(` / ${report.job_name}`)),
			)
			.flatMap((report) =>
				report.failures.map((test) => ({ ...test, artifact_id: report.artifact_id })),
			);
		try {
			if (tests.length === 0) {
				const { data } = await octokit.rest.actions.downloadJobLogsForWorkflowRun({
					...repository,
					job_id: job.id,
				});
				tests = parseFailedTests(typeof data === 'string' ? data : Buffer.from(data).toString());
			}
		} catch (error) {
			errors.push({ job_id: job.id, error: error.message });
		}
		failures.push({
			id: job.id,
			name: job.name,
			url: job.html_url,
			conclusion: job.conclusion,
			steps: (job.steps ?? [])
				.filter((step) => FAILED.has(step.conclusion))
				.map((step) => step.name),
			tests,
		});
	}

	return {
		kind: 'merge_queue_run_failed',
		id: `${repository.owner}/${repository.repo}:run:${run.id}:${run.run_attempt}`,
		merge_group: groupContext(run.head_sha, run.head_branch),
		run: {
			id: run.id,
			attempt: run.run_attempt,
			workflow: run.name,
			url: run.html_url,
			conclusion: run.conclusion,
			created_at: run.created_at,
			updated_at: run.updated_at,
		},
		failed_jobs: failures,
		reports,
		errors,
	};
}

export async function snapshotQueue(octokit, { owner, repo }, branch) {
	const entries = [];
	let cursor = null;
	do {
		const response = await octokit.graphql(
			`query($owner: String!, $repo: String!, $branch: String!, $cursor: String) {
				repository(owner: $owner, name: $repo) {
					mergeQueue(branch: $branch) {
						entries(first: 100, after: $cursor) {
							nodes {
								id position enqueuedAt
								headCommit { oid }
								baseCommit { oid }
								pullRequest { number headRefOid }
							}
							pageInfo { hasNextPage endCursor }
						}
					}
				}
			}`,
			{ owner, repo, branch, cursor },
		);
		const page = response.repository.mergeQueue?.entries;
		for (const entry of page?.nodes ?? []) {
			if (!entry?.pullRequest) continue;
			entries.push({
				id: entry.id,
				position: entry.position,
				enqueued_at: entry.enqueuedAt,
				group_head_sha: entry.headCommit?.oid ?? null,
				group_base_sha: entry.baseCommit?.oid ?? null,
				pr: entry.pullRequest.number,
				pr_head_sha: entry.pullRequest.headRefOid,
			});
		}
		cursor = page?.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
	} while (cursor);
	return entries;
}

export async function collectQueueEvent(octokit, repository, event, sourceRunId) {
	const group = event.merge_group;
	const pr = event.pull_request;
	const payload = group
		? {
				kind: 'merge_queue_group_created',
				id: `${repository.owner}/${repository.repo}:group:${group.head_sha}`,
				merge_group: {
					...groupContext(group.head_sha, group.head_ref),
					base_sha: group.base_sha,
					base_ref: group.base_ref,
				},
			}
		: {
				kind: `merge_queue_pr_${event.action}`,
				id: `${repository.owner}/${repository.repo}:pr:${pr.number}:${event.action}:${sourceRunId}`,
				pr: { number: pr.number, head_sha: pr.head.sha, base_ref: pr.base.ref, url: pr.html_url },
				reason: event.reason ?? null,
			};
	payload.errors = [];
	try {
		payload.queue = await snapshotQueue(
			octokit,
			repository,
			group ? group.base_ref.replace(/^refs\/heads\//, '') : pr.base.ref,
		);
	} catch (error) {
		payload.queue = [];
		payload.errors.push({ error: error.message });
	}
	return payload;
}

export async function sendEvent(payload, env = process.env, request = fetch) {
	if (!env.MERGE_QUEUE_WEBHOOK_URL) {
		console.log('MERGE_QUEUE_WEBHOOK_URL is not set. The event is available as an artifact.');
		return;
	}
	if (!env.QA_METRICS_WEBHOOK_USER || !env.QA_METRICS_WEBHOOK_PASSWORD) {
		throw new Error('QA_METRICS_WEBHOOK_USER and QA_METRICS_WEBHOOK_PASSWORD are required');
	}
	const response = await request(env.MERGE_QUEUE_WEBHOOK_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Basic ${Buffer.from(`${env.QA_METRICS_WEBHOOK_USER}:${env.QA_METRICS_WEBHOOK_PASSWORD}`).toString('base64')}`,
		},
		body: JSON.stringify(payload),
		signal: AbortSignal.timeout(10_000),
	});
	if (!response.ok) throw new Error(`Merge queue webhook returned HTTP ${response.status}`);
}

export async function main() {
	const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
	const { octokit, owner, repo } = initGithub();
	const run = event.workflow_run;
	if (run && (run.event !== 'merge_group' || !FAILED.has(run.conclusion))) return;
	if (!run && !event.merge_group && !['enqueued', 'dequeued'].includes(event.action)) return;
	const payload = {
		schema_version: 1,
		repository: `${owner}/${repo}`,
		observed_at: new Date().toISOString(),
		...(run
			? await collectFailedRun(octokit, { owner, repo }, run)
			: await collectQueueEvent(octokit, { owner, repo }, event, process.env.GITHUB_RUN_ID)),
	};
	writeFileSync('merge-queue-event.json', `${JSON.stringify(payload, null, 2)}\n`);
	if (process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(
			process.env.GITHUB_STEP_SUMMARY,
			`Merge queue event: **${payload.kind}**. Download the event artifact for evidence.\n`,
		);
	}
	await sendEvent(payload);
}
