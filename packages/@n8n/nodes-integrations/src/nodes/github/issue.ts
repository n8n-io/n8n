import { parse, t, type Infer, type Loose } from '@n8n/node-sdk';

const user = t.obj({ login: t.str(), id: t.int(), html_url: t.str().optional() });

const label = t.obj({
	id: t.int(),
	name: t.str(),
	color: t.str().optional(),
	description: t.nullable(t.str()).optional(),
});

/**
 * An issue with the fields a workflow reads. The output is closed, so a misspelt field fails
 * `tsc`; the action drops the other fields of the API response. GitHub may leave out any field,
 * e.g. `locked`, so each field is typical. GitHub sends `null` for an empty body, an open issue
 * and no milestone, so these fields stay optional and nullable. GitHub sends `pull_request`
 * only for a pull request.
 */
export const issue = t.loose(
	t.obj({
		id: t.int(),
		['number']: t.int(),
		title: t.str(),
		state: t.oneOf('open', 'closed'),
		state_reason: t.nullable(t.str()),
		html_url: t.str(),
		body: t.nullable(t.str()),
		user,
		labels: t.arr(label),
		assignees: t.arr(user),
		milestone: t.nullable(t.obj({ ['number']: t.int(), title: t.str() })),
		comments: t.int(),
		locked: t.bool(),
		created_at: t.str(),
		updated_at: t.str(),
		closed_at: t.nullable(t.str()),
		pull_request: t.obj({ html_url: t.str() }).optional(),
	}),
);

export type Issue = Infer<typeof issue>;

type User = Infer<typeof user>;

// The API response has more fields than the output. A list page keeps them, and its check
// still accepts an issue that leaves out a field or sends it as `null`.
const open = { additionalProperties: true } as const;
export const issueResponse = t.loose(
	t
		.obj({
			id: t.int(),
			['number']: t.int(),
			title: t.str(),
			state: t.oneOf('open', 'closed'),
			state_reason: t.str(),
			html_url: t.str(),
			body: t.str(),
			user: user.with(open),
			labels: t.arr(label.with(open)),
			assignees: t.arr(user.with(open)),
			milestone: t.obj({ ['number']: t.int(), title: t.str() }).with(open),
			comments: t.int(),
			locked: t.bool(),
			created_at: t.str(),
			updated_at: t.str(),
			closed_at: t.str(),
			pull_request: t.obj({ html_url: t.str() }).with(open),
		})
		.with(open),
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
