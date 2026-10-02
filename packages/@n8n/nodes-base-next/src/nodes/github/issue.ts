import {
	arr,
	bool,
	int,
	loose,
	nullable,
	obj,
	oneOf,
	parse,
	str,
	type Infer,
	type Loose,
} from '@n8n/node-sdk';

const user = obj({ login: str(), id: int(), html_url: str().optional() });

const label = obj({
	id: int(),
	name: str(),
	color: str().optional(),
	description: nullable(str()).optional(),
});

/**
 * An issue with the fields a workflow reads. The output is closed, so a misspelt field fails
 * `tsc`; the action drops the other fields of the API response. GitHub may leave out any field,
 * e.g. `locked`, or send `pull_request: null`, so each field is optional and nullable.
 */
export const issue = loose(
	obj({
		id: int(),
		['number']: int(),
		title: str(),
		state: oneOf('open', 'closed'),
		state_reason: str(),
		html_url: str(),
		body: str(),
		user,
		labels: arr(label),
		assignees: arr(user),
		milestone: obj({ ['number']: int(), title: str() }),
		comments: int(),
		locked: bool(),
		created_at: str(),
		updated_at: str(),
		closed_at: str(),
		pull_request: obj({ html_url: str() }),
	}),
);

export type Issue = Infer<typeof issue>;

type User = Infer<typeof user>;

// The API response has more fields than the output. A list page keeps them, and its check
// still accepts an issue that leaves out a field or sends it as `null`.
const open = { additionalProperties: true } as const;
export const issueResponse = loose(
	obj({
		id: int(),
		['number']: int(),
		title: str(),
		state: oneOf('open', 'closed'),
		state_reason: str(),
		html_url: str(),
		body: str(),
		user: user.with(open),
		labels: arr(label.with(open)),
		assignees: arr(user.with(open)),
		milestone: obj({ ['number']: int(), title: str() }).with(open),
		comments: int(),
		locked: bool(),
		created_at: str(),
		updated_at: str(),
		closed_at: str(),
		pull_request: obj({ html_url: str() }).with(open),
	}).with(open),
);

const userOf = ({ login, id, html_url }: Loose<User>) => ({ login, id, html_url });

/** The output fields of one issue of the GitHub REST API. Other response fields drop out. */
export const issueOf = (value: unknown): Issue => issueFrom(parse(issueResponse, value));

/** The output fields of one issue response. */
export function issueFrom(raw: Infer<typeof issueResponse>): Issue {
	return {
		id: raw.id,
		['number']: raw['number'],
		title: raw.title,
		state: raw.state,
		state_reason: raw.state_reason,
		html_url: raw.html_url,
		body: raw.body,
		user: raw.user && userOf(raw.user),
		labels: raw.labels?.map((entry) => ({
			id: entry.id,
			name: entry.name,
			color: entry.color,
			description: entry.description,
		})),
		assignees: raw.assignees?.map(userOf),
		milestone: raw.milestone && { ['number']: raw.milestone['number'], title: raw.milestone.title },
		comments: raw.comments,
		locked: raw.locked,
		created_at: raw.created_at,
		updated_at: raw.updated_at,
		closed_at: raw.closed_at,
		pull_request: raw.pull_request && { html_url: raw.pull_request.html_url },
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
