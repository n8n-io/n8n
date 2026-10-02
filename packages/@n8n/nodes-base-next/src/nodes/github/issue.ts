import { arr, bool, int, nullable, obj, oneOf, parse, str, type Infer } from '@n8n/node-sdk';

const user = obj({ login: str(), id: int(), html_url: str().optional() });

const label = obj({
	id: int(),
	name: str(),
	color: str().optional(),
	description: nullable(str()).optional(),
});

/**
 * An issue with the fields a workflow reads. The output is closed, so a misspelt field fails
 * `tsc`; the action drops the other fields of the API response.
 */
export const issue = obj({
	id: int(),
	['number']: int(),
	title: str(),
	state: oneOf('open', 'closed'),
	state_reason: nullable(str()).optional(),
	html_url: str(),
	body: nullable(str()),
	user: nullable(user),
	labels: arr(label),
	assignees: arr(user),
	milestone: nullable(obj({ ['number']: int(), title: str() })),
	comments: int(),
	locked: bool(),
	created_at: str(),
	updated_at: str(),
	closed_at: nullable(str()),
	pull_request: obj({ html_url: str() }).optional(),
});

export type Issue = Infer<typeof issue>;

// The API response has more fields than the output; these schemas type what the output reads.
const open = { additionalProperties: true } as const;
const userResponse = user.with(open);
export const issueResponse = obj({
	id: int(),
	['number']: int(),
	title: str(),
	state: oneOf('open', 'closed'),
	state_reason: nullable(str()).optional(),
	html_url: str(),
	body: nullable(str()).optional(),
	user: nullable(userResponse).optional(),
	labels: arr(label.with(open)),
	assignees: arr(userResponse).optional(),
	milestone: nullable(obj({ ['number']: int(), title: str() }).with(open)).optional(),
	comments: int(),
	locked: bool(),
	created_at: str(),
	updated_at: str(),
	closed_at: nullable(str()).optional(),
	pull_request: obj({ html_url: str() }).with(open).optional(),
}).with(open);

const userOf = ({ login, id, html_url }: Infer<typeof userResponse>) => ({ login, id, html_url });

/** The output fields of one issue of the GitHub REST API. Throws with the path of a bad field. */
export const issueOf = (value: unknown): Issue => issueFrom(parse(issueResponse, value));

/** The output fields of one parsed issue response. */
export function issueFrom(raw: Infer<typeof issueResponse>): Issue {
	return {
		id: raw.id,
		['number']: raw['number'],
		title: raw.title,
		state: raw.state,
		state_reason: raw.state_reason,
		html_url: raw.html_url,
		body: raw.body ?? null,
		user: raw.user ? userOf(raw.user) : null,
		labels: raw.labels.map(({ id, name, color, description }) => ({
			id,
			name,
			color,
			description,
		})),
		assignees: (raw.assignees ?? []).map(userOf),
		milestone: raw.milestone
			? { ['number']: raw.milestone['number'], title: raw.milestone.title }
			: null,
		comments: raw.comments,
		locked: raw.locked,
		created_at: raw.created_at,
		updated_at: raw.updated_at,
		closed_at: raw.closed_at ?? null,
		pull_request: raw.pull_request ? { html_url: raw.pull_request.html_url } : undefined,
	};
}

/** The issues path of a repository. Each name is one encoded path segment. */
export const issuesPath = ({
	owner,
	repository,
}: {
	readonly owner: string;
	readonly repository: string;
}): `/${string}` => `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/issues`;
