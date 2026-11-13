/**
 * Compiled library poll: a hand port of the `poll` of
 * `n8n-nodes-base.gmailTrigger`, versions 1 to 1.4, for production runs
 * (spec section 9.8). One call polls once and returns the new messages; an
 * empty list means that v1 would return `null` and start no execution.
 *
 * The cursor lives in the static data of the trigger node, as in v1:
 * `ctx.staticData('node', <node name>)`, and from version 1.1 one level
 * deeper, under the node name. It keeps `lastTimeChecked`,
 * `lastTimeCheckedIsBounded` and `possibleDuplicates`, and from version 1.4
 * `pendingMessageIds`, `failedFetches` and `noProgressTicks`.
 *
 * The converter adds two parameters that the v1 node does not have:
 * `pollNode`, the node name, and `pollVersion`, the node version.
 *
 * Limits: `simple` on only (the raw mode parses MIME messages with
 * mailparser in the fallback host), OAuth2 only. v1 logs a warning or an
 * error where this port says nothing. The time budget of a poll is 5 minutes
 * of the batch clock (`getPollBudgetMs` outside the durable scheduler).
 */
import { defineNode, type Item } from '@n8n/workflow-lang';

interface TriggerFilters {
	includeSpamTrash?: boolean;
	includeDrafts?: boolean;
	labelIds?: string[] | string;
	q?: string;
	readStatus?: string;
	sender?: string;
}

interface GmailTriggerParameters {
	authentication?: string;
	event?: string;
	simple?: boolean;
	maxResults?: number;
	filters?: TriggerFilters;
	options?: Record<string, unknown>;
	pollNode?: string;
	pollVersion?: number;
}

interface Cursor {
	lastTimeChecked?: number;
	lastTimeCheckedIsBounded?: boolean;
	possibleDuplicates?: string[];
	pendingMessageIds?: string[];
	failedFetches?: Array<[string, number]>;
	noProgressTicks?: number;
}

interface GmailMessage {
	id: string;
	internalDate?: string;
	date?: string;
	headers?: { date?: string };
	labelIds?: string[];
	payload?: { headers?: Array<{ name: string; value: string }> } & Record<string, unknown>;
	[key: string]: unknown;
}

const MAX_SCAN_PAGES = 20;
const MAX_TRACKED_BACKLOG_IDS = 5000;
const MAX_PENDING_FETCH_ATTEMPTS = 10;
const MAX_NO_PROGRESS_TICKS = 3;
/** `getPollBudgetMs` of a poll outside the durable scheduler. */
const POLL_BUDGET_MS = 300000;

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The cursor object itself: a view of the static data, changed in place. */
function isCursor(value: unknown): value is Cursor {
	return isObject(value);
}

/** The unique values of a list, first occurrence first (v1 uses a Set). */
function unique(values: string[]): string[] {
	const out: string[] = [];
	for (const v of values) if (!out.includes(v)) out.push(v);
	return out;
}

/**
 * prepareTimestamp of the v1 node for a cursor in seconds: Luxon reads no ISO
 * date from a number, and a number of fewer than 12 digits is the timestamp.
 */
function afterQuery(query: string, seconds: number): string {
	return query ? `${query} after:${seconds}` : `after:${seconds}`;
}

/** prepareQuery of the v1 node, over the trigger filters and the cursor. */
function listQuery(filters: TriggerFilters, startDate: number): Record<string, unknown> {
	const qs: Record<string, unknown> = { ...filters };
	let q: string | undefined = filters.q;
	if (qs.labelIds === '') delete qs.labelIds;
	if (filters.sender) {
		q = q ? `${q} from:${filters.sender}` : `from:${filters.sender}`;
		delete qs.sender;
	}
	if (filters.readStatus && filters.readStatus !== 'both') {
		q = q ? `${q} is:${filters.readStatus}` : `is:${filters.readStatus}`;
	}
	delete qs.readStatus;
	if (startDate) q = afterQuery(q ?? '', startDate);
	if (q !== undefined) qs.q = q;
	return qs;
}

/** simplifyOutput of the v1 node: label names, and the headers as fields. */
function simplify(message: GmailMessage, labels: Array<{ id: string; name: string }>): Item {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(message)) {
		if (key === 'labelIds') continue;
		if (key === 'payload' && message.payload) {
			const payload: Record<string, unknown> = {};
			for (const [k, v] of Object.entries(message.payload)) if (k !== 'headers') payload[k] = v;
			out.payload = payload;
			continue;
		}
		out[key] = value;
	}
	if (message.labelIds) {
		const ids = message.labelIds;
		out.labels = labels.filter((label) => ids.includes(label.id));
	}
	for (const header of message.payload?.headers ?? []) out[header.name] = header.value;
	return out;
}

export default defineNode<GmailTriggerParameters>({
	type: 'n8n-nodes-base.gmailTrigger',
	version: 1.4,
	supports: {
		operations: {
			default: [
				'authentication="oAuth2"',
				'event="messageReceived"',
				'simple=true',
				'maxResults',
				'filters',
				'filters.includeSpamTrash',
				'filters.includeDrafts',
				'filters.labelIds',
				'filters.q',
				'filters.readStatus',
				'filters.sender',
				'options',
				'pollNode',
				'pollVersion',
			],
		},
	},
	async run(ctx, parameters, _items, credential) {
		if ((parameters.authentication ?? 'oAuth2') !== 'oAuth2') {
			throw new Error('Gmail Trigger: only OAuth2 authentication is in the compiled library');
		}
		if (parameters.simple === false) {
			throw new Error('Gmail Trigger: only simplified output is in the compiled library');
		}
		const version = parameters.pollVersion ?? 1.4;
		const nodeName = parameters.pollNode ?? 'Gmail Trigger';
		const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
		const api = 'https://www.googleapis.com/gmail/v1/users/me';
		const get = async <T>(url: string, qs: Record<string, unknown>): Promise<T> => {
			const response = await ctx.http<T>({
				method: 'GET',
				url,
				headers,
				qs,
				body: undefined,
				credential,
			});
			if (response.status >= 400) throw new Error(`Gmail: HTTP status ${response.status}`);
			return response.body;
		};

		const bucket = ctx.staticData('node', nodeName);
		if (version > 1 && !(nodeName in bucket)) bucket[nodeName] = {};
		const found = version > 1 ? bucket[nodeName] : bucket;
		const data: Cursor = isCursor(found) ? found : {};

		const now = Math.floor(Date.now() / 1000);
		// Production runs only: v1's manual mode runs in the fallback host.
		if (data.lastTimeChecked === undefined || data.lastTimeChecked === null)
			data.lastTimeChecked = now;
		if (!data.lastTimeCheckedIsBounded) {
			data.lastTimeChecked = Math.min(data.lastTimeChecked, now);
			data.lastTimeCheckedIsBounded = true;
		}
		const startDate = data.lastTimeChecked;

		const options = parameters.options ?? {};
		const filters = parameters.filters ?? {};
		const limited = version >= 1.4;
		const pollDeadline = Date.now() + POLL_BUDGET_MS;
		const maxResults = limited ? (parameters.maxResults ?? 10) : Number.MAX_SAFE_INTEGER;

		const messagesOut: GmailMessage[] = [];
		let responseData: Item[] = [];
		const fetched: Array<{ id: string; date: number }> = [];
		const scannedPossibleDuplicates: string[] = [];

		const emailDate = (email: GmailMessage): number => {
			let date = NaN;
			if (email.internalDate) date = Number(email.internalDate) / 1000;
			else if (email.date) date = Date.parse(String(email.date)) / 1000;
			else if (email.headers?.date) date = Date.parse(String(email.headers.date)) / 1000;
			if (!date || isNaN(date)) return startDate;
			return date;
		};
		const fetchQs = (): Record<string, unknown> => ({
			format: 'metadata',
			metadataHeaders: ['From', 'To', 'Cc', 'Bcc', 'Subject'],
		});
		const includeDrafts =
			version > 1.1 ? (filters.includeDrafts ?? false) : (filters.includeDrafts ?? true);

		const fetchAndProcess = async (id: string, qs: Record<string, unknown>): Promise<void> => {
			const message = await get<GmailMessage>(`${api}/messages/${id}`, qs);
			fetched.push({ id: message.id, date: emailDate(message) });
			if (limited) data.noProgressTicks = 0;
			if (!includeDrafts && message.labelIds?.includes('DRAFT')) return;
			if (
				version > 1.2 &&
				message.labelIds?.includes('SENT') &&
				!message.labelIds.includes('INBOX')
			) {
				return;
			}
			messagesOut.push(message);
			responseData.push(message);
		};

		const simplifyAll = async (): Promise<void> => {
			if (responseData.length === 0) return;
			try {
				const labelData = await get<{ labels?: Array<{ id: string; name: string }> }>(
					`${api}/labels`,
					{},
				);
				const labels = (labelData.labels ?? []).map((label) => ({
					id: label.id,
					name: label.name,
				}));
				responseData = messagesOut.map((message) => simplify(message, labels));
			} catch {
				// v1 logs the error and keeps the items in their raw shape.
			}
		};

		let windowFullyScanned = false;
		let early: Item[] | undefined;

		try {
			let budget = maxResults;
			const setAside = data.failedFetches ?? [];
			const retryable = setAside.filter((entry) => entry[1] < MAX_PENDING_FETCH_ATTEMPTS);
			const givenUp = setAside.filter((entry) => entry[1] >= MAX_PENDING_FETCH_ATTEMPTS);

			if (limited && retryable.length > 0) {
				const retryNow = retryable.slice(0, maxResults);
				const retryLater = retryable.slice(maxResults);
				const stillFailing: Array<[string, number]> = [];
				const qs = fetchQs();
				let retried = 0;
				for (const entry of retryNow) {
					retried += 1;
					try {
						await fetchAndProcess(entry[0], qs);
						budget -= 1;
					} catch {
						const attempted = entry[1] + 1;
						if (attempted >= MAX_PENDING_FETCH_ATTEMPTS) givenUp.push([entry[0], attempted]);
						else stillFailing.push([entry[0], attempted]);
					}
					if (Date.now() >= pollDeadline) break;
				}
				data.failedFetches = retryNow.slice(retried).concat(retryLater, stillFailing, givenUp);
			}

			const pendingIds = data.pendingMessageIds ?? [];
			if (limited && pendingIds.length > 0 && budget > 0) {
				const qs = fetchQs();
				const newlyFailed: Array<[string, number]> = [];
				for (let index = 0; index < pendingIds.length; index++) {
					const id = pendingIds[index];
					if (budget <= 0 || newlyFailed.length >= maxResults) break;
					try {
						await fetchAndProcess(id, qs);
						budget -= 1;
					} catch {
						newlyFailed.push([id, 1]);
					}
					data.pendingMessageIds = pendingIds.slice(index + 1);
					if (Date.now() >= pollDeadline) break;
				}
				if (newlyFailed.length > 0)
					data.failedFetches = (data.failedFetches ?? []).concat(newlyFailed);
			}

			if (
				limited &&
				((data.pendingMessageIds?.length ?? 0) > 0 ||
					(fetched.length > 0 && Date.now() >= pollDeadline))
			) {
				await simplifyAll();
				if (fetched.length > 0) {
					data.possibleDuplicates = unique(
						(data.possibleDuplicates ?? []).concat(fetched.map((m) => m.id)),
					);
				}
				early = responseData;
			} else {
				// Scan for new messages.
				const qs = listQuery({ ...filters }, startDate);
				for (const [key, value] of Object.entries(options)) qs[key] = value;
				if (version > 1.3)
					qs.q = typeof qs.q === 'string' && qs.q ? `${qs.q} -in:scheduled` : '-in:scheduled';

				let messages: Array<{ id: string }> = [];
				let pageToken: string | undefined;
				let pagesScanned = 0;
				do {
					const page = await get<{ messages?: Array<{ id: string }>; nextPageToken?: string }>(
						`${api}/messages`,
						pageToken ? { ...qs, pageToken } : qs,
					);
					messages = messages.concat(page.messages ?? []);
					pageToken = page.nextPageToken;
					pagesScanned++;
				} while (
					limited &&
					pageToken &&
					pagesScanned < MAX_SCAN_PAGES &&
					Date.now() < pollDeadline
				);
				windowFullyScanned = !pageToken;

				// One entry per id, the last occurrence's value at the first position (a Map).
				const byId: Array<{ id: string }> = [];
				const ids: string[] = [];
				for (const m of messages) {
					const at = ids.indexOf(m.id);
					if (at >= 0) byId[at] = m;
					else {
						ids.push(m.id);
						byId.push(m);
					}
				}
				messages = byId;

				if (limited) {
					const previous = data.possibleDuplicates ?? [];
					const tracked = previous
						.concat((data.failedFetches ?? []).map((entry) => entry[0]))
						.concat(fetched.map((m) => m.id));
					if (tracked.length > 0) {
						messages = messages.filter((m) => {
							if (previous.includes(m.id)) scannedPossibleDuplicates.push(m.id);
							return !tracked.includes(m.id);
						});
					}
					if (messages.length > 0 && data.noProgressTicks) data.noProgressTicks = 0;
					if (messages.length === 0 && fetched.length === 0) {
						if (!windowFullyScanned) {
							const ticks = (data.noProgressTicks ?? 0) + 1;
							if (ticks < MAX_NO_PROGRESS_TICKS) {
								data.noProgressTicks = ticks;
								return [];
							}
							if (now > startDate) data.lastTimeChecked = now;
							data.noProgressTicks = 0;
						} else if (data.noProgressTicks) {
							data.noProgressTicks = 0;
						}
						return [];
					}
				}

				let toProcess = messages;
				let beyondBudget: string[] = [];
				if (limited && messages.length > budget) {
					toProcess = messages.slice(0, budget);
					beyondBudget = messages.slice(budget).map((m) => m.id);
				}
				if (limited) data.pendingMessageIds = toProcess.map((m) => m.id).concat(beyondBudget);

				if (toProcess.length > 0) {
					const qs2 = fetchQs();
					for (const [key, value] of Object.entries(options)) qs2[key] = value;
					delete qs2.includeDrafts;
					const scannedButFailed: Array<[string, number]> = [];
					for (let index = 0; index < toProcess.length; index++) {
						const message = toProcess[index];
						try {
							await fetchAndProcess(message.id, qs2);
						} catch {
							scannedButFailed.push([message.id, 1]);
						}
						if (limited) {
							data.pendingMessageIds = toProcess
								.slice(index + 1)
								.map((m) => m.id)
								.concat(beyondBudget);
							if (Date.now() >= pollDeadline) break;
						}
					}
					if (scannedButFailed.length > 0)
						data.failedFetches = (data.failedFetches ?? []).concat(scannedButFailed);
				}
			}
		} catch {
			// v1 logs the error; the cursor update below still runs.
		}
		if (early !== undefined) return early;

		await simplifyAll();
		if (fetched.length === 0) return [];

		const lastEmailDate = fetched.reduce((last, m) => (m.date > last ? m.date : last), 0);
		const nextDuplicates = scannedPossibleDuplicates.concat(fetched.map((m) => m.id));
		if (!limited) {
			const previous = data.possibleDuplicates ?? [];
			if (previous.length > 0) {
				responseData = responseData.filter(
					(item) => typeof item.id === 'string' && !previous.includes(item.id),
				);
			}
		}
		let effective = Math.floor(Math.max(lastEmailDate, startDate)) || startDate;
		effective = Math.max(startDate, Math.min(effective, now));
		if (limited && !windowFullyScanned) {
			const trackedIds =
				(data.pendingMessageIds?.length ?? 0) +
				(data.possibleDuplicates?.length ?? 0) +
				(data.failedFetches?.length ?? 0);
			if (trackedIds < MAX_TRACKED_BACKLOG_IDS) effective = startDate;
		}
		if (effective === startDate && (data.possibleDuplicates?.length ?? 0) > 0) {
			data.possibleDuplicates = unique((data.possibleDuplicates ?? []).concat(nextDuplicates));
		} else {
			data.possibleDuplicates = nextDuplicates;
		}
		data.lastTimeChecked = effective;
		return responseData;
	},
});
