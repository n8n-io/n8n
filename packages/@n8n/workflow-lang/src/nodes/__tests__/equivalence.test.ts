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
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import { EQUIVALENCE_CASES } from './equivalence-cases.ts';
import type { EquivalenceCase, NormalRequest, Recording } from './equivalence.ts';
import { applyCredential, normalizeRequest, withoutInstanceId } from './equivalence.ts';

const here = dirname(fileURLToPath(import.meta.url));
const recordings: Record<string, Recording> = JSON.parse(
	readFileSync(join(here, 'v1-requests.json'), 'utf8'),
);
const typesBuilt = existsSync(join(DEFAULT_NODE_PACKAGES[0], 'dist/known/credentials.json'));

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
			parameters: ${JSON.stringify(c.parameters)},
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
		// The parser adds the final line break of a 7bit or quoted-printable part.
		text: mail.html ? undefined : mail.text?.replace(/\n+$/, ''),
		html: mail.html ? withoutInstanceId(mail.html).replace(/\n+$/, '') : undefined,
	};
}

/** Replaces a `raw` MIME body with its parsed fields. */
async function withParsedMime(requests: NormalRequest[]): Promise<NormalRequest[]> {
	const out: NormalRequest[] = [];
	for (const request of requests) {
		if (isRecord(request.body) && typeof request.body.raw === 'string') {
			out.push({ ...request, body: { ...request.body, raw: await readMime(request.body.raw) } });
		} else {
			out.push(request);
		}
	}
	return out;
}

describe.runIf(typesBuilt)('request equivalence with v1 nodes', () => {
	const registry = registryOf(loadCredentialTypes().types);

	describe.each(EQUIVALENCE_CASES.map((c) => ({ ...c, label: c.name })))('$label', (c) => {
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

		const fixture = {
			trigger: { body: {}, headers: {}, query: {} },
			now: 0,
			seed: 1,
			effects: {
				Node: c.serviceResults ?? c.responses.map((r) => ({ status: 200, headers: {}, ...r })),
			},
		};

		it('gives the same output from the bytecode as from the reference runner', async () => {
			const compiled = compile(workflowSource(c));
			expect(compiled.module).toBeDefined();
			const reference = await runReference(workflowSource(c), fixture);
			const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
			expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
		});

		it('sends the same requests and gives the same output', async () => {
			const out = await runReference(workflowSource(c), fixture);
			expect(out.status).toBe(c.expectedError === undefined ? 'ok' : 'error');
			if (c.expectedError !== undefined) {
				expect(isRecord(out.result) ? out.result.message : out.result).toBe(c.expectedError);
			}
			// The data as the credentials file holds it (`buildCredentialsFile`).
			const data = withDerivedValues(c.credential?.type ?? '', {
				...(registry.get(c.credential?.type ?? '')?.defaults ?? {}),
				...c.credential?.data,
			});
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
				await withParsedMime(withoutFormat(recording.requests)),
			);
			// The error is not the output of a run that failed.
			if (c.expectedError === undefined) expect(out.result).toEqual(recording.output);
		});
	});
});
