/**
 * Compares a compiled node with the v1 node on one case: the requests, and
 * the output or the error message. The v1 node is the reference model of a
 * compiled node (`recordV1` runs n8n's real node code with a fake HTTP client).
 */
import { withDerivedValues } from '../../credentials/derived.ts';
import { deriveInject } from '../../credentials/inject.ts';
import type { EquivalenceCase } from '../../nodes/__tests__/equivalence.ts';
import { applyCredential, normalizeRequest } from '../../nodes/__tests__/equivalence.ts';
import { recordV1 } from '../../nodes/__tests__/v1-recorder.ts';
import { runReference } from '../../reference/runner.ts';
import type { NodeSources } from '../convert.ts';
import { compileNodeInstance } from '../convert.ts';

type Registry = Parameters<typeof deriveInject>[0];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Fails after `ms`: a v1 node that waits for ever must not stop the check. */
async function within<T>(ms: number, work: Promise<T>): Promise<T> {
	let timer: NodeJS.Timeout | undefined;
	const late = new Promise<never>((_resolve, reject) => {
		timer = setTimeout(() => reject(new Error(`no result after ${ms} ms`)), ms);
	});
	try {
		return await Promise.race([work, late]);
	} finally {
		clearTimeout(timer);
	}
}

/** `undefined` when the compiled node and the v1 node agree, else the first difference. */
export async function differenceFromV1(
	c: EquivalenceCase,
	sources: NodeSources,
	registry: Registry,
): Promise<string | undefined> {
	const compiled = compileNodeInstance(
		sources,
		{ type: c.type, version: c.typeVersion, parameters: c.parameters },
		null,
	);
	if ('errors' in compiled) return `does not compile: ${compiled.errors[0]}`;
	const credentialType = c.credential?.type;
	const source = `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'verify' })],
	${credentialType ? `credentials: { c: { type: ${JSON.stringify(credentialType)} } },` : ''}
	async run(ctx) {
		return await ctx.node({
			name: 'Node',
			type: ${JSON.stringify(compiled.type)},
			typeVersion: ${c.typeVersion},
			parameters: {},
			${c.items ? `items: ${JSON.stringify(c.items)},` : ''}
			${credentialType ? "credential: 'c'," : ''}
		});
	},
});
`;
	const fixture = {
		trigger: { body: {}, headers: {}, query: {} },
		now: 0,
		seed: 1,
		effects: { Node: c.responses.map((r) => ({ status: 200, headers: {}, ...r })) },
	};
	const out = await runReference(source, fixture, {
		extraNodes: { [compiled.file]: compiled.source },
	});
	const v1 = await within(8000, recordV1(c));

	const data = withDerivedValues(credentialType ?? '', {
		...(registry.get(credentialType ?? '')?.defaults ?? {}),
		...c.credential?.data,
	});
	const inject = credentialType ? deriveInject(registry, credentialType, data).inject : undefined;
	const requests = out.effects.map((effect) => {
		const args = isRecord(effect.args) ? effect.args : {};
		const { qsFormat: _, ...request } = normalizeRequest(
			applyCredential(
				{
					method: String(args.method),
					url: String(args.url),
					headers: args.headers,
					qs: args.qs,
					body: args.body,
				},
				inject,
				data,
			),
		);
		return request;
	});
	const expected = v1.requests.map(({ qsFormat: _, ...r }) => r);
	if (JSON.stringify(requests) !== JSON.stringify(expected)) return 'the requests differ';
	if (v1.error !== undefined) {
		if (out.status !== 'error') return 'v1 fails and the compiled node does not';
		const message = isRecord(out.result) ? out.result.message : out.result;
		return message === v1.error ? undefined : `the error differs: ${String(message)} / ${v1.error}`;
	}
	if (out.status !== 'ok')
		return `the compiled node fails: ${JSON.stringify(out.result).slice(0, 120)}`;
	return JSON.stringify(out.result) === JSON.stringify(v1.output)
		? undefined
		: 'the output differs';
}
