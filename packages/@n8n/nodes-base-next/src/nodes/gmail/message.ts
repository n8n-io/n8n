import { isRecord, list, readAs, t, type Http, type Infer } from '@n8n/node-sdk';

const label = t.obj({ id: t.str(), name: t.str() });

/** A message as the v2 node emits it with `simple: true`. */
export const simplifiedMessage = t
	.obj({
		id: t.str(),
		threadId: t.str(),
		snippet: t.str(),
		historyId: t.str(),
		internalDate: t.str().hint('Epoch milliseconds as a string'),
		sizeEstimate: t.int(),
		labels: t.arr(label).optional(),
		payload: t.obj({ mimeType: t.str() }).with({ additionalProperties: true }).optional(),
		From: t.str().hint('A string such as "Ada <ada@example.com>"').optional(),
		To: t.str().optional(),
		Cc: t.str().optional(),
		Bcc: t.str().optional(),
		Subject: t.str().optional(),
	})
	.with({ additionalProperties: true, 'x-n8n-hint': 'Metadata and snippet only; no body' });

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
	// The message is the output, so the host warns about a field in another shape.
	return readAs(simplifiedMessage, simplifyMessage(message, labels), { path: 'message' }).value;
}
