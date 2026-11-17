/**
 * Request equivalence of compiled library nodes and v1 nodes.
 *
 * `v1-requests.json` holds what the v1 nodes sent, recorded from n8n's real
 * code by `scripts/record-v1-requests.ts`. This test runs the same cases
 * through the library nodes in the reference runner, applies the credential
 * the way the runtime does (with the inject that `wfc credentials` derives),
 * and compares the normalized `{ method, url, headers, qs, body }` of every
 * request, and the output items.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../../compiler/index.ts';
import { withDerivedValues } from '../../credentials/derived.ts';
import { deriveInject } from '../../credentials/inject.ts';
import { DEFAULT_NODE_PACKAGES, loadCredentialTypes, registryOf } from '../../credentials/types.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { googleMint } from '../../node-compile/specialise.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import { VENDOR_NODES } from '../../convert/ai-cluster.ts';
import { ENGINE_CASES } from './ai-cases.ts';
import { EQUIVALENCE_CASES, ERROR_ITEM_CASES } from './equivalence-cases.ts';
import type { EquivalenceCase, NormalRequest, Recording } from './equivalence.ts';
import {
	applyCredential,
	errorDetailOfResult,
	normalizeRequest,
	withoutInstanceId,
} from './equivalence.ts';

const here = dirname(fileURLToPath(import.meta.url));
const recordings: Record<string, Recording> = JSON.parse(
	readFileSync(join(here, 'v1-requests.json'), 'utf8'),
);
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
/** The name of the token that the converter asks n8n for, for a Sheets node with a service account. */
const SHEETS_MINT = googleMint('sheetV2', [
	'https://www.googleapis.com/auth/drive.file',
	'https://www.googleapis.com/auth/spreadsheets',
	'https://www.googleapis.com/auth/drive.metadata',
]).name;
const typesBuilt = existsSync(join(DEFAULT_NODE_PACKAGES[0], 'dist/known/credentials.json'));

/** The parameters of the library call, as the converter writes them. */
function libraryParameters(c: EquivalenceCase): Record<string, unknown> {
	const vendor = VENDOR_NODES[c.type];
	if (vendor) {
		// As `lowerLibrary` writes them: the node runs once and gets the parameters of each item.
		const adapted = vendor.adapt(c.parameters, c.typeVersion);
		return {
			resource: adapted.resource ?? vendor.resource,
			operation: adapted.operation ?? vendor.operation,
			batch: (c.items ?? [{}]).map(() => adapted),
		};
	}
	return c.parameters;
}

function workflowSource(c: EquivalenceCase): string {
	const credentials = c.credential
		? `credentials: { c: { type: ${JSON.stringify(c.credential.type)} } },`
		: '';
	const credential = c.credential ? "credential: 'c'," : '';
	return `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'equivalence' })],
	${credentials}
	async run(ctx) {
		return await ctx.node({
			name: 'Node',
			type: ${JSON.stringify(c.type)},
			typeVersion: ${c.typeVersion},
			parameters: ${JSON.stringify(libraryParameters(c))},
			${c.items ? `items: ${JSON.stringify(c.items)},` : ''}
			${credential}
		});
	},
});
`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface ParsedAddress {
	value: Array<{ address?: string; name?: string }>;
}
interface ParsedMail {
	from?: ParsedAddress;
	to?: ParsedAddress;
	cc?: ParsedAddress;
	bcc?: ParsedAddress;
	replyTo?: ParsedAddress;
	subject?: string;
	text?: string;
	html?: string | false;
	inReplyTo?: string;
	references?: string | string[];
}
type SimpleParser = (source: Buffer) => Promise<ParsedMail>;

/**
 * A Gmail `raw` message as the fields a reader sees. The v1 node and the
 * library node encode the same message with different bytes (nodemailer adds
 * a random Message-ID, a Date header and its own transfer encoding).
 */
async function readMime(raw: string): Promise<unknown> {
	const nodesBase = createRequire(join(DEFAULT_NODE_PACKAGES[0], 'package.json'));
	const { simpleParser } = nodesBase('mailparser') as { simpleParser: SimpleParser };
	const mail = await simpleParser(Buffer.from(raw, 'base64url'));
	const list = (a?: ParsedAddress) =>
		a?.value.map((v) => ({ address: v.address, name: v.name ?? '' }));
	return {
		from: list(mail.from),
		to: list(mail.to),
		cc: list(mail.cc),
		bcc: list(mail.bcc),
		replyTo: list(mail.replyTo),
		subject: mail.subject,
		inReplyTo: mail.inReplyTo,
		references: mail.references,
		// The parser adds the final line break of a 7bit or quoted-printable part.
		text: mail.html ? undefined : mail.text?.replace(/\n+$/, ''),
		html: mail.html ? withoutInstanceId(mail.html).replace(/\n+$/, '') : undefined,
	};
}

/** Replaces a `raw` MIME body with its parsed fields. */
async function withParsedMime(requests: NormalRequest[]): Promise<NormalRequest[]> {
	const out: NormalRequest[] = [];
	for (const request of requests) {
		const draft = isRecord(request.body) ? request.body.message : undefined;
		if (isRecord(request.body) && typeof request.body.raw === 'string') {
			out.push({ ...request, body: { ...request.body, raw: await readMime(request.body.raw) } });
		} else if (isRecord(request.body) && isRecord(draft) && typeof draft.raw === 'string') {
			// A Gmail draft holds the message in `message.raw`.
			const message = { ...draft, raw: await readMime(draft.raw) };
			out.push({ ...request, body: { ...request.body, message } });
		} else {
			out.push(request);
		}
	}
	return out;
}

describe.runIf(typesBuilt)('request equivalence with v1 nodes', () => {
	const registry = registryOf(loadCredentialTypes().types);

	// The cases with sub-nodes or node settings of the AI nodes run through the converter
	// (`ai-cluster.test.ts`).
	const cases = EQUIVALENCE_CASES.filter(
		(c) => !ENGINE_CASES.includes(c) && !ERROR_ITEM_CASES.includes(c),
	);
	describe.each(cases.map((c) => ({ ...c, label: c.name })))('$label', (c) => {
		const recording = recordings[c.name];

		it('has a v1 recording of the result that the case names', () => {
			expect(recording).toBeDefined();
			// A case with `expectedError` names the error that v1 raises, and has no output.
			expect(recording.error).toBe(c.expectedError);
		});

		it('compiles', () => {
			const result = compile(workflowSource(c));
			expect(result.diagnostics).toEqual([]);
		});

		// A Google service account: v1 asks Google for a token before each request. n8n makes
		// that token for the library node (`n8nMinted`), so the library node does not send these
		// requests and does not get their responses.
		const tokenRequest = (recording?.requests ?? []).map((r) => r.url === TOKEN_URL);
		const answerOf = (k: number) => c.responses[Math.min(k, c.responses.length - 1)];
		const minted = tokenRequest.includes(true);
		const responses = minted
			? tokenRequest.flatMap((token, k) => (token ? [] : [answerOf(k)]))
			: c.responses;
		const fixture = {
			trigger: { body: {}, headers: {}, query: {} },
			now: 0,
			seed: 1,
			effects: {
				Node: c.serviceResults ?? responses.map((r) => ({ status: 200, headers: {}, ...r })),
			},
		};

		it('gives the same output from the bytecode as from the reference runner', async () => {
			const compiled = compile(workflowSource(c));
			expect(compiled.module).toBeDefined();
			const reference = await runReference(workflowSource(c), fixture);
			const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
			expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
		});

		it.skipIf(c.pendingParity !== undefined)(
			'sends the same requests and gives the same output',
			async () => {
				const out = await runReference(workflowSource(c), fixture);
				expect(out.status).toBe(c.expectedError === undefined ? 'ok' : 'error');
				if (c.expectedError !== undefined) {
					expect(isRecord(out.result) ? out.result.message : out.result).toBe(c.expectedError);
					// The description and the HTTP code are those of v1 too.
					if (recording.errorDetail !== undefined) {
						expect(errorDetailOfResult(out.result)).toEqual(recording.errorDetail);
					}
				}
				// The data as the credentials file holds it (`buildCredentialsFile`).
				const data = withDerivedValues(c.credential?.type ?? '', {
					...(registry.get(c.credential?.type ?? '')?.defaults ?? {}),
					...c.credential?.data,
				});
				if (minted) {
					const token = answerOf(tokenRequest.indexOf(true)).body;
					data.n8nMinted = { [SHEETS_MINT]: token };
				}
				const inject = c.credential
					? deriveInject(registry, c.credential.type, data).inject
					: undefined;
				if (c.serviceResults) {
					// A node of an n8n service: its calls are `service` effects (spec 9.9).
					for (const effect of out.effects) expect(effect.kind).toBe('service');
					expect(out.effects.map((e) => e.args)).toEqual(recording.services);
					expect(out.result).toEqual(recording.output);
					return;
				}
				const requests: NormalRequest[] = out.effects.map((effect) => {
					expect(effect.kind).toBe('http');
					const args = isRecord(effect.args) ? effect.args : {};
					return normalizeRequest(
						applyCredential(
							{
								method: String(args.method),
								url: String(args.url),
								headers: args.headers,
								qs: args.qs,
								body: args.body,
								qsFormat: typeof args.qsFormat === 'string' ? args.qsFormat : 'repeat',
								inject: args.inject,
							},
							inject,
							data,
						),
					);
				});
				// The query format matters when a member of `qs` is an array or an object.
				const nested = (r: NormalRequest) =>
					Object.values(r.qs).some((v) => typeof v === 'object' && v !== null);
				recording.requests.forEach((r, k) => {
					if (r.qsFormat !== undefined && nested(r)) {
						expect(requests[k]?.qsFormat, `qsFormat of request ${k}`).toBe(r.qsFormat);
					}
				});
				const withoutFormat = (list: NormalRequest[]) => list.map(({ qsFormat: _, ...r }) => r);
				expect(await withParsedMime(withoutFormat(requests))).toEqual(
					await withParsedMime(
						withoutFormat(recording.requests.filter((_request, k) => !tokenRequest[k])),
					),
				);
				// The error is not the output of a run that failed.
				if (c.expectedError === undefined) expect(out.result).toEqual(recording.output);
			},
		);
	});
});
