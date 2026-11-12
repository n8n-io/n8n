import { createHash } from 'node:crypto';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { isRecord, type GymAdmin } from './gym-admin';
import type { McpCaller } from './mcp-upstream';
import type { Hydrator } from './router';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDENT = /^([A-Za-z0-9]+)-(\d+)$/;

type Obj = Record<string, unknown>;

const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
const omitUndef = (o: Obj): Obj =>
	Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null));

// Stable uuid-like id from a seed string (hash, version and variant bits set).
function hashUuid(seed: string): string {
	const h = createHash('sha1').update(seed).digest('hex');
	const variant = ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16);
	return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}
const uuidOr = (v: unknown, seed: string): string => {
	const s = str(v);
	return s && UUID.test(s) ? s : hashUuid(seed);
};

// Parse the JSON text of a tool result. Undefined when it is not JSON or is an error.
function parseResult(res: CallToolResult): unknown {
	if (res.isError) return undefined;
	for (const c of res.content) {
		if (c.type !== 'text') continue;
		try {
			return JSON.parse(c.text);
		} catch {
			// Not JSON.
		}
	}
	return undefined;
}

// A list result is an array, or an object that holds one array (any key).
function asList(v: unknown): Obj[] {
	if (Array.isArray(v)) return v.filter(isRecord);
	if (!isRecord(v)) return [];
	for (const x of Object.values(v)) if (Array.isArray(x)) return x.filter(isRecord);
	return [];
}

// A single-object result is the object, or an object wrapping one under a known key.
function asObj(v: unknown, keys: string[]): Obj | undefined {
	if (!isRecord(v)) return undefined;
	for (const k of keys) if (isRecord(v[k])) return v[k];
	return v;
}

export class LinearHydrator implements Hydrator {
	private readonly seeded = new Set<string>();
	// Label name -> label ref, for labels already seeded.
	private readonly labelRefs = new Map<string, string>();
	// Team ref -> state names seeded for it. An unknown state would fail the seed.
	private readonly teamStates = new Map<string, Set<string>>();

	constructor(private readonly deps: { admin: GymAdmin; tenant: string; upstream: McpCaller }) {}

	async hydrate(
		_tool: string,
		args: Record<string, unknown>,
		result: CallToolResult,
	): Promise<void> {
		const refs = collectIssueRefs(args, result).filter((r) => !this.seeded.has(`ref:${r}`));
		for (const ref of refs) {
			const overlay = await this.buildOverlay(ref);
			await this.deps.admin.seed(this.deps.tenant, overlay);
			this.markSeeded(overlay);
			this.seeded.add(`ref:${ref}`);
		}
	}

	// Read-only upstream call. A failure gives undefined so optional data can be missing.
	private async read(name: string, args: Obj): Promise<unknown> {
		try {
			return parseResult(await this.deps.upstream.callTool(name, args));
		} catch {
			return undefined;
		}
	}

	private async buildOverlay(ref: string): Promise<Obj> {
		// The only required step: without the issue there is nothing to seed.
		const issue = asObj(await this.read('get_issue', { id: ref }), ['issue']);
		const issueId = issue && str(issue.uuid);
		if (!issue || !issueId || !UUID.test(issueId)) {
			throw new Error(`cannot hydrate issue ${ref}: get_issue returned no uuid`);
		}
		const identifier = str(issue.id) ?? (IDENT.test(ref) ? ref : undefined);
		const identMatch = identifier ? IDENT.exec(identifier) : null;

		const teamName = str(issue.team) ?? 'Team';
		const teamId = uuidOr(issue.teamId, `team:${teamName}`);
		const teamRef = `team:${teamId}`;
		const teams: Obj[] = [];
		const users = new Map<string, Obj>();
		const labels: Obj[] = [];
		const projects: Obj[] = [];

		// Team: key and name from get_team, states from list_issue_statuses.
		if (!this.seeded.has(teamRef)) {
			const t = asObj(await this.read('get_team', { query: str(issue.teamId) ?? teamName }), ['team']);
			const statuses = asList(await this.read('list_issue_statuses', { team: str(issue.teamId) ?? teamName }));
			const states = statuses.map((s, n) =>
				omitUndef({
					id: uuidOr(s.id, `state:${teamId}:${str(s.name)}`),
					name: str(s.name),
					type: str(s.type),
					color: str(s.color),
					position: typeof s.position === 'number' ? s.position : n,
				}),
			);
			// The issue state must exist in the team, even when the list was empty.
			const stateName = str(issue.status);
			if (stateName && !states.some((s) => s.name === stateName)) {
				states.push(omitUndef({
					id: hashUuid(`state:${teamId}:${stateName}`), name: stateName, type: str(issue.statusType),
				}));
			}
			this.teamStates.set(teamRef, new Set(states.map((s) => String(s.name))));
			teams.push(omitUndef({
				id: teamId, ref: teamRef,
				key: str(t?.key) ?? identMatch?.[1] ?? teamName.toUpperCase().slice(0, 5),
				name: str(t?.name) ?? teamName, states,
			}));
		}

		// Users: assignee and creator. get_user gives the email when it is visible.
		const addUser = async (idRaw: unknown, nameRaw: unknown): Promise<string | undefined> => {
			const raw = str(idRaw);
			if (!raw || !UUID.test(raw)) return undefined;
			const userRef = `user:${raw}`;
			if (!this.seeded.has(userRef) && !users.has(raw)) {
				const u = asObj(await this.read('get_user', { query: raw }), ['user']);
				users.set(raw, omitUndef({
					id: raw, ref: userRef,
					email: str(u?.email) ?? `${raw}@unknown.invalid`,
					name: str(u?.name) ?? str(nameRaw),
					display_name: str(u?.displayName),
				}));
			}
			return userRef;
		};
		const assignee = await addUser(issue.assigneeId, issue.assignee);
		const creator = await addUser(issue.createdById, issue.createdBy);

		// Labels: the issue has names only. Resolve ids from list_issue_labels.
		const names = Array.isArray(issue.labels) ? issue.labels.filter((l): l is string => typeof l === 'string') : [];
		let labelList: Obj[] | undefined;
		const labelRefs: string[] = [];
		for (const name of names) {
			const known = this.labelRefs.get(name);
			if (known) {
				labelRefs.push(known);
				continue;
			}
			labelList ??= asList(await this.read('list_issue_labels', { team: str(issue.teamId) ?? teamName }));
			const found = labelList.find((l) => l.name === name);
			const lid = uuidOr(found?.id, `label:${name}`);
			const lref = `label:${lid}`;
			labelRefs.push(lref);
			if (!labels.some((l) => l.ref === lref)) {
				labels.push(omitUndef({ id: lid, ref: lref, name, color: str(found?.color) }));
			}
		}

		// Project.
		let projectRef: string | undefined;
		const rawProject = str(issue.projectId);
		if (rawProject && UUID.test(rawProject)) {
			projectRef = `project:${rawProject}`;
			if (!this.seeded.has(projectRef)) {
				const p = asObj(await this.read('get_project', { query: rawProject }), ['project']);
				projects.push(omitUndef({
					id: rawProject, ref: projectRef,
					name: str(p?.name) ?? str(issue.project) ?? 'Project',
					description: str(p?.description) ?? str(p?.summary) ?? '',
					team: teamRef,
				}));
			}
		}

		// Comments.
		const commentRes = await this.read('list_comments', { issueId: issueId });
		const comments: Obj[] = [];
		for (const c of asList(commentRes)) {
			const author = isRecord(c.author) ? c.author : undefined;
			comments.push(omitUndef({
				id: uuidOr(c.id, `comment:${issueId}:${str(c.createdAt)}:${str(c.body)}`),
				user: await addUser(author?.id ?? c.userId, author?.name),
				body: str(c.body) ?? '',
				at: str(c.createdAt),
			}));
		}

		const priority = isRecord(issue.priority) ? issue.priority.value : issue.priority;
		const outIssue = omitUndef({
			id: issueId,
			number: identMatch ? Number(identMatch[2]) : undefined,
			ref: `issue:${issueId}`, team: teamRef,
			title: str(issue.title) ?? 'Untitled',
			description: str(issue.description) ?? '',
			state: this.teamStates.get(teamRef)?.has(String(issue.status)) ? str(issue.status) : undefined,
			priority: typeof priority === 'number' ? priority : undefined,
			due_date: str(issue.dueDate), at: str(issue.createdAt),
			assignee, creator, labels: labelRefs, project: projectRef, comments,
		});
		return {
			world_version: 1,
			native: { linear: { teams, users: [...users.values()], labels, projects, issues: [outIssue] } },
		};
	}

	private markSeeded(overlay: Obj): void {
		const lin = isRecord(overlay.native) && isRecord(overlay.native.linear) ? overlay.native.linear : {};
		for (const list of Object.values(lin)) {
			if (!Array.isArray(list)) continue;
			for (const o of list) {
				if (!isRecord(o)) continue;
				const r = str(o.ref);
				if (r) this.seeded.add(r);
				if (r?.startsWith('label:') && str(o.name)) this.labelRefs.set(String(o.name), r);
			}
		}
	}
}

// Find issue UUIDs in the real read result. Fall back to uuid or identifier args.
function collectIssueRefs(args: Record<string, unknown>, result: CallToolResult): string[] {
	const found = new Set<string>();
	const walk = (v: unknown): void => {
		if (Array.isArray(v)) v.forEach(walk);
		else if (isRecord(v)) {
			const uuid = str(v.uuid);
			if (uuid && UUID.test(uuid)) found.add(uuid);
			Object.values(v).forEach(walk);
		}
	};
	for (const c of result.content) {
		if (c.type !== 'text') continue;
		try {
			walk(JSON.parse(c.text));
		} catch {
			// Not JSON. Nothing to find.
		}
	}
	if (found.size === 0) {
		for (const key of ['id', 'issueId', 'issue']) {
			const v = args[key];
			if (typeof v === 'string' && (UUID.test(v) || IDENT.test(v))) found.add(v);
		}
	}
	return [...found];
}
