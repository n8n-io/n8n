import { arr, int, isRecord, list, matches, obj, str, type Http, type Infer } from '@n8n/node-sdk';

const label = obj({ id: str(), name: str() });

/** A message as the v2 node emits it with `simple: true`. */
export const simplifiedMessage = obj({
	id: str(),
	threadId: str(),
	snippet: str(),
	historyId: str(),
	internalDate: str().hint('Epoch milliseconds as a string'),
	sizeEstimate: int(),
	labels: arr(label).optional(),
	payload: obj({ mimeType: str() }).with({ additionalProperties: true }).optional(),
	From: str().hint('A string such as "Ada <ada@example.com>"').optional(),
	To: str().optional(),
	Cc: str().optional(),
	Bcc: str().optional(),
	Subject: str().optional(),
}).with({ additionalProperties: true, 'x-n8n-hint': 'Metadata and snippet only; no body' });

type Label = Infer<typeof label>;

const METADATA = { format: 'metadata', metadataHeaders: ['From', 'To', 'Cc', 'Bcc', 'Subject'] };

export async function labelsOf(http: Http): Promise<Label[]> {
	const response = await http.request({ path: '/labels' });
	return list(isRecord(response) ? response.labels : undefined).flatMap((entry) =>
		isRecord(entry) && typeof entry.id === 'string' && typeof entry.name === 'string'
			? [{ id: entry.id, name: entry.name }]
			: [],
	);
}

/** Mirrors `simplifyOutput` in nodes-base Gmail/GenericFunctions.ts. */
export function simplifyMessage(message: unknown, labels: readonly Label[]) {
	if (!isRecord(message)) return {};
	const { labelIds, payload, ...rest } = message;
	const { headers, ...payloadFields } = isRecord(payload) ? payload : {};
	return {
		...rest,
		...(Array.isArray(labelIds)
			? { labels: labels.filter((entry) => labelIds.includes(entry.id)) }
			: {}),
		...(payload === undefined ? {} : { payload: isRecord(payload) ? payloadFields : payload }),
		...Object.fromEntries(
			list(headers).flatMap((header) =>
				isRecord(header) && typeof header.name === 'string' ? [[header.name, header.value]] : [],
			),
		),
	};
}

export async function getMessage(
	http: Http,
	id: string,
	labels: readonly Label[],
): Promise<Infer<typeof simplifiedMessage>> {
	const message = await http.request({
		path: `/messages/${encodeURIComponent(id)}`,
		query: METADATA,
	});
	const simplified = simplifyMessage(message, labels);
	if (!matches(simplifiedMessage, simplified)) throw new Error(`Gmail returned no message ${id}`);
	return simplified;
}
