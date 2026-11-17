export interface Lookup {
	tool: string;
	args: Record<string, unknown>;
}

const MAX_LABELS = 2;
const MAX_PEOPLE = 4;
const MAX_TEAMS = 2;
// Keys of a real result that name a person.
const PERSON_KEYS: ReadonlySet<string> = new Set([
	'assignee',
	'creator',
	'lead',
	'delegate',
	'author',
	'user',
]);

const text = (value: unknown): string | undefined =>
	typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

// The people a real result names: an object with an id, or a plain name.
function peopleIn(result: unknown): string[] {
	const found = new Set<string>();
	const visit = (value: unknown, depth: number) => {
		if (depth > 6 || found.size >= MAX_PEOPLE) return;
		if (Array.isArray(value)) {
			for (const item of value.slice(0, 50)) visit(item, depth + 1);
		} else if (isRecord(value)) {
			for (const [key, item] of Object.entries(value)) {
				const query = PERSON_KEYS.has(key)
					? isRecord(item)
						? (text(item.id) ?? text(item.name))
						: text(item)
					: undefined;
				if (query) found.add(query);
				else visit(item, depth + 1);
			}
		}
	};
	visit(result, 0);
	return [...found].slice(0, MAX_PEOPLE);
}

// The teams that a real result names. An issue shows its team as a name.
function teamsIn(result: unknown): string[] {
	const found = new Set<string>();
	const visit = (value: unknown, depth: number) => {
		if (depth > 6 || found.size >= MAX_TEAMS) return;
		if (Array.isArray(value)) {
			for (const item of value.slice(0, 50)) visit(item, depth + 1);
		} else if (isRecord(value)) {
			for (const [key, item] of Object.entries(value)) {
				const name = key === 'team' ? text(item) : undefined;
				if (name) found.add(name);
				else visit(item, depth + 1);
			}
		}
	};
	visit(result, 0);
	return [...found].slice(0, MAX_TEAMS);
}

/**
 * Real reads for the objects that a Linear call needs in the gym, before the model plans: the team
 * (with its states), the project, the user of the connection, the labels, the parent issue and the
 * people that the real result names. The gym answers "Could not find referenced X" for an object it
 * does not hold. A list with no items does not hold it either, so the call's own result can not be
 * the source. The gym also refuses a user without an email, and the result shows names only.
 */
export function linearLookups(
	tool: string,
	args: Record<string, unknown>,
	result?: unknown,
): Lookup[] {
	const found: Lookup[] = [];
	const team = text(args.team);
	const project = text(args.project);
	if (team) {
		found.push({ tool: 'get_team', args: { query: team } });
		found.push({ tool: 'list_issue_statuses', args: { team } });
	}
	if (project) found.push({ tool: 'get_project', args: { query: project } });
	// The connected user: real name and email. The same read serves the whole chat.
	found.push({ tool: 'whoami', args: {} });
	const assignee = text(args.assignee);
	// "me" is the connected user. whoami has it.
	if (assignee && assignee !== 'me') found.push({ tool: 'get_user', args: { query: assignee } });
	const parent = text(args.parentId);
	if (parent) found.push({ tool: 'get_issue', args: { id: parent } });
	const labels = [args.label, ...(Array.isArray(args.labels) ? args.labels : [args.labels])]
		.flatMap((l) => text(l) ?? [])
		.slice(0, MAX_LABELS);
	for (const name of labels)
		found.push({ tool: 'list_issue_labels', args: team ? { name, team } : { name } });
	// The team of an issue in the result, with its states. The gym team has the default state only.
	for (const name of teamsIn(result)) {
		found.push({ tool: 'get_team', args: { query: name } });
		found.push({ tool: 'list_issue_statuses', args: { team: name } });
	}
	for (const query of peopleIn(result)) found.push({ tool: 'get_user', args: { query } });
	// The call itself already is the real read of its own object. A repeat is read once.
	const seen = new Set<string>();
	return found.filter((l) => {
		const key = `${l.tool} ${JSON.stringify(l.args)}`;
		if (l.tool === tool || seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/**
 * The gym refuses a user without an email. When the real data has none, give the user one that
 * can not clash with a real address and is the same for the same user. A real email stays.
 */
export function withUserEmails(overlay: Record<string, unknown>): Record<string, unknown> {
	const native = overlay.native;
	if (!isRecord(native)) return overlay;
	const linear = native.linear;
	if (!isRecord(linear) || !Array.isArray(linear.users)) return overlay;
	const users = linear.users.map((u: unknown) => {
		if (!isRecord(u) || text(u.email)) return u;
		const basis = text(u.id) ?? text(u.ref) ?? text(u.name) ?? 'user';
		const slug =
			basis
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '')
				.slice(0, 12) || 'user';
		return { ...u, email: `user-${slug}@unknown.invalid` };
	});
	return { ...overlay, native: { ...native, linear: { ...linear, users } } };
}

const MAX_SOURCES = 2;

/**
 * Real reads for the data sources that a Notion query names. The rows of a query do not carry the
 * title or the schema of their database, and the gym refuses a database without a title. The fetch
 * of the data source has both.
 */
export function notionLookups(tool: string, args: Record<string, unknown>): Lookup[] {
	if (tool !== 'notion-query-data-sources') return [];
	const data = isRecord(args.data) ? args.data : args;
	const urls = [
		data.data_source_url,
		...(Array.isArray(data.data_source_urls) ? data.data_source_urls : []),
	]
		.flatMap((u) => text(u) ?? [])
		.slice(0, MAX_SOURCES);
	return urls.map((id) => ({ tool: 'notion-fetch', args: { id } }));
}
