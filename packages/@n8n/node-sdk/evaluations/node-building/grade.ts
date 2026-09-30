import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { stripVTControlCharacters } from 'node:util';

import { fetchLog, type LoggedRequest } from './mock-server';
import { CHECK_COMMAND, loadNewProject, runNewAction } from './n1-adapter';
import { loadOldPackage, runOldNode, type Outcome } from './old-executor';
import type { CaseSpec, Format, RequestExpectation, TaskSpec } from './tasks';
import { exec, isRecord, type ExecResult } from './util';
import { workspaceEnv } from './workspace';

export interface Check {
	readonly name: string;
	readonly pass: boolean;
	readonly reason: string;
}

export interface GradeResult {
	readonly pass: boolean;
	readonly checks: readonly Check[];
	readonly seconds: number;
}

type Credential = { readonly type: string; readonly data: Record<string, string> };

interface Project {
	readonly checks: readonly Check[];
	readonly run?: (caseSpec: CaseSpec, credential?: Credential) => Promise<Outcome>;
}

const check = (name: string, pass: boolean, reason = ''): Check => ({
	name,
	pass,
	reason: pass ? '' : reason,
});

const tail = (result: ExecResult) =>
	(result.timedOut ? 'timed out; ' : '') +
	stripVTControlCharacters(result.output).trim().slice(-1500);

const commandCheck = (name: string, result: ExecResult) =>
	check(name, result.code === 0 && !result.timedOut, tail(result));

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

function credentialCheck(task: TaskSpec, credentials: readonly unknown[]): Check {
	const found = credentials.find(
		(credential) => isRecord(credential) && credential.name === task.credential.name,
	);
	const fields =
		isRecord(found) && Array.isArray(found.properties)
			? found.properties.flatMap((property) =>
					isRecord(property) && typeof property.name === 'string' ? [property.name] : [],
				)
			: [];
	const missing = task.credential.properties.filter((name) => !fields.includes(name));
	return check(
		'credential',
		found !== undefined && missing.length === 0,
		found
			? `credential fields missing: ${missing.join(', ')}`
			: `no credential ${task.credential.name}`,
	);
}

async function prepareOld(dir: string, task: TaskSpec): Promise<Project> {
	const env = workspaceEnv(dir);
	const build = commandCheck('build', await exec('n8n-node', ['build'], { cwd: dir, env }));
	const lint = commandCheck('lint', await exec('n8n-node', ['lint'], { cwd: dir, env }));
	if (!build.pass) return { checks: [build, lint] };
	try {
		const loaded = await loadOldPackage(dir);
		return {
			checks: [
				build,
				lint,
				check(
					'node',
					task.node in loaded.nodeTypes,
					`no node ${task.node} in package.json n8n.nodes`,
				),
				credentialCheck(task, Object.values(loaded.credentialTypes)),
			],
			run: async ({ operation, input }, credential) => {
				const [resource, operationName] = operation.split('.');
				return await runOldNode(
					loaded,
					task.node,
					{ resource, operation: operationName, ...input },
					credential,
				);
			},
		};
	} catch (error) {
		return { checks: [build, lint, check('load', false, errorText(error))] };
	}
}

async function prepareNew(dir: string, task: TaskSpec): Promise<Project> {
	const env = workspaceEnv(dir);
	const [command, ...args] = CHECK_COMMAND;
	const typecheck = commandCheck('typecheck', await exec('tsc', ['--noEmit'], { cwd: dir, env }));
	const sdkCheck = commandCheck('check', await exec(command, args, { cwd: dir, env }));
	try {
		const project = await loadNewProject(dir);
		return {
			checks: [
				typecheck,
				sdkCheck,
				check('node', project.node.id === task.node, `node id is not ${task.node}`),
				credentialCheck(task, project.credentials),
			],
			run: async ({ operation, input }, credential) => {
				const id = `${task.node}.${operation}`;
				const action = project.actions.find((candidate) => candidate.id === id);
				return action
					? await runNewAction(dir, project, action, input, credential)
					: { ok: false, error: `no action ${id} in actions` };
			},
		};
	} catch (error) {
		return { checks: [typecheck, sdkCheck, check('load', false, errorText(error))] };
	}
}

/** JSON text with sorted keys: equal values have equal text, and `undefined` fields drop out like in JSON. */
const canonical = (value: unknown) =>
	JSON.stringify(value ?? null, (_key, nested: unknown) =>
		isRecord(nested)
			? Object.fromEntries(Object.entries(nested).sort(([a], [b]) => a.localeCompare(b)))
			: nested,
	);

const sameJson = (a: unknown, b: unknown) => canonical(a) === canonical(b);

const short = (value: unknown) => JSON.stringify(value)?.slice(0, 300) ?? 'undefined';

function itemProblems(actual: readonly unknown[], expected: readonly unknown[]): string[] {
	const first = expected.findIndex((item, index) => !sameJson(actual[index], item));
	const extra = actual.length > expected.length ? actual[expected.length] : undefined;
	return [
		...(actual.length !== expected.length
			? [`expected ${expected.length} items, got ${actual.length}`]
			: []),
		...(first >= 0
			? [`item ${first}: expected ${short(expected[first])}, got ${short(actual[first])}`]
			: extra !== undefined
				? [`extra item: ${short(extra)}`]
				: []),
	];
}

const pick = (item: unknown, fields: readonly string[]) =>
	isRecord(item) ? Object.fromEntries(fields.map((field) => [field, item[field]])) : item;

function requestMismatch(request: LoggedRequest, expected: RequestExpectation): string[] {
	const wrongQuery = Object.entries(expected.query ?? {}).filter(
		([name, value]) => request.query[name] !== value,
	);
	const present = (expected.absentQuery ?? []).filter((name) => name in request.query);
	return [
		...(request.method !== expected.method || request.path !== expected.path
			? [`${request.method} ${request.path}, expected ${expected.method} ${expected.path}`]
			: []),
		...wrongQuery.map(([name, value]) => `query ${name}=${request.query[name]}, expected ${value}`),
		...present.map((name) => `query ${name} must be absent`),
		...(expected.body !== undefined && !sameJson(request.body, expected.body)
			? [`body ${short(request.body)}, expected ${short(expected.body)}`]
			: []),
	];
}

function paginationProblems(served: readonly LoggedRequest[], mode: string | undefined): string[] {
	if (mode === 'cursor') {
		return served.flatMap((request, index) => {
			const cursor = request.query.cursor;
			const previous = served[index - 1]?.nextCursor;
			if (index === 0) return cursor === undefined ? [] : ['the first request sends a cursor'];
			return cursor === previous
				? []
				: [`request ${index + 1} sends cursor ${cursor}, not the previous nextCursor ${previous}`];
		});
	}
	if (mode === 'offset') {
		return served.flatMap((request, index) => {
			const expected = served.slice(0, index).reduce((sum, page) => sum + (page.returned ?? 0), 0);
			const offset = Number(request.query.offset ?? 0);
			return offset === expected
				? []
				: [`request ${index + 1} sends offset ${offset}, expected ${expected}`];
		});
	}
	return [];
}

function requestProblems(log: readonly LoggedRequest[], expected: RequestExpectation): string[] {
	if (log.length === 0) return ['the mock got no request with the case credential'];
	const served = log.filter((request) => request.status !== 429);
	const [first, second] = log;
	const retry = !expected.retryAfter429
		? []
		: first.status !== 429 || second === undefined
			? ['no retry after the 429 response']
			: second.at - first.at < 900
				? [`retried after ${second.at - first.at} ms; Retry-After asks for 1 s`]
				: [];
	const beforeLast = served.slice(0, -1).reduce((sum, request) => sum + (request.returned ?? 0), 0);
	return [
		...retry,
		...served
			.flatMap((request, index) =>
				requestMismatch(request, expected).map((problem) => `request ${index + 1}: ${problem}`),
			)
			.slice(0, 3),
		...(expected.count !== undefined && served.length !== expected.count
			? [`${served.length} requests, expected ${expected.count}`]
			: []),
		...paginationProblems(served, expected.pagination),
		...(expected.limit !== undefined && served.length > 1 && beforeLast >= expected.limit
			? [`fetched a page after it had ${expected.limit} items`]
			: []),
	];
}

/** Items GitHub returns for the case, read with `gh api`, which uses the grader's own login. */
async function githubItems(path: string, limit?: number): Promise<unknown[]> {
	const url = `${path}${path.includes('?') ? '&' : '?'}per_page=100`;
	const result = await exec('gh', ['api', '--paginate', '--slurp', url], {
		cwd: process.cwd(),
		timeoutMs: 120_000,
	});
	if (result.code !== 0) throw new Error(`gh api ${url} failed: ${tail(result)}`);
	const pages: unknown = JSON.parse(result.output);
	const items = Array.isArray(pages) ? pages.flat() : [];
	return limit === undefined ? items : items.slice(0, limit);
}

async function githubToken(): Promise<string | undefined> {
	const result = await exec('gh', ['auth', 'token'], { cwd: process.cwd(), timeoutMs: 30_000 });
	const token = result.output.trim();
	return result.code === 0 && token !== '' ? token : undefined;
}

const CASE_TIMEOUT_MS = 90_000;

async function withTimeout(run: Promise<Outcome>): Promise<Outcome> {
	const abort = new AbortController();
	const timeout = sleep(CASE_TIMEOUT_MS, undefined, { signal: abort.signal }).then(
		(): Outcome => ({ ok: false, error: `timed out after ${CASE_TIMEOUT_MS / 1000} s` }),
		(): Outcome => ({ ok: false, error: 'aborted' }),
	);
	return await Promise.race([run, timeout]).finally(() => abort.abort());
}

async function gradeCase(
	task: TaskSpec,
	caseSpec: CaseSpec,
	project: Project,
	token: string | undefined,
): Promise<Check> {
	const name = `case:${caseSpec.id}`;
	if (!project.run) return check(name, false, 'not run: the project did not build or load');
	const secret = `${task.credential.secretPrefix ?? ''}${randomUUID().slice(0, 8)}_${caseSpec.id}`;
	const needsToken = Object.values(task.credential.data).some((value) =>
		value.includes('{{githubToken}}'),
	);
	const data = Object.fromEntries(
		Object.entries(task.credential.data).map(([field, value]) => [
			field,
			value.replace('{{secret}}', secret).replace('{{githubToken}}', token ?? ''),
		]),
	);
	const credential = needsToken && !token ? undefined : { type: task.credential.name, data };
	const outcome = await withTimeout(project.run(caseSpec, credential));
	const { expect } = caseSpec;
	const outcomeProblems = expect.error
		? outcome.ok
			? [`expected an error, got ${outcome.items.length} items`]
			: []
		: !outcome.ok
			? [`failed: ${outcome.error}`]
			: expect.github
				? itemProblems(
						outcome.items.map((item) => pick(item, expect.github?.fields ?? [])),
						(await githubItems(expect.github.path, expect.github.limit)).map((item) =>
							pick(item, expect.github?.fields ?? []),
						),
					)
				: itemProblems(outcome.items, expect.items ?? []);
	const requests = expect.requests ? requestProblems(await fetchLog(secret), expect.requests) : [];
	const problems = [...outcomeProblems, ...requests];
	const reason = problems.join('; ');
	return check(name, problems.length === 0, token ? reason.split(token).join('***') : reason);
}

/** Grades one project directory: format checks, then every case of the task. */
export async function grade(dir: string, task: TaskSpec, format: Format): Promise<GradeResult> {
	const started = Date.now();
	const project = format === 'old' ? await prepareOld(dir, task) : await prepareNew(dir, task);
	const token = task.cases.some(({ expect }) => expect.github) ? await githubToken() : undefined;
	const cases = await task.cases.reduce<Promise<Check[]>>(
		async (previous, caseSpec) => [
			...(await previous),
			await gradeCase(task, caseSpec, project, token).catch((error: unknown) =>
				check(`case:${caseSpec.id}`, false, errorText(error)),
			),
		],
		Promise.resolve([]),
	);
	const checks = [...project.checks, ...cases];
	return {
		pass: checks.every(({ pass }) => pass),
		checks,
		seconds: (Date.now() - started) / 1000,
	};
}
