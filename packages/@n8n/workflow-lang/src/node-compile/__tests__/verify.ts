import { withDerivedValues } from '../../credentials/derived.ts';
import { deriveInject } from '../../credentials/inject.ts';
import type { PublicCredential } from '../../credentials/public.ts';
import { publicCredential } from '../../credentials/public.ts';
import type { EquivalenceCase } from '../../nodes/__tests__/equivalence.ts';
import { applyCredential, normalizeRequest } from '../../nodes/__tests__/equivalence.ts';
import { recordV1 } from '../../nodes/__tests__/v1-recorder.ts';
import { runReference } from '../../reference/runner.ts';
import type { NodeSources } from '../convert.ts';
import { compileNodeInstance } from '../convert.ts';
import { evaluateDerivation } from '../evaluate-node.ts';

export const V1_TIMEZONE = 'America/New_York';

type Registry = Parameters<typeof deriveInject>[0];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function credentialsOf(
	c: EquivalenceCase,
	registry: Registry,
): Record<string, PublicCredential> {
	if (!c.credential) return {};
	return {
		[c.credential.type]: publicCredential(registry.get(c.credential.type), c.credential.data),
	};
}

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

export async function differenceFromV1(
	c: EquivalenceCase,
	sources: NodeSources,
	registry: Registry,
): Promise<string | undefined> {
	const compiled = compileNodeInstance(
		sources,
		{ type: c.type, version: c.typeVersion, parameters: c.parameters },
		null,
		credentialsOf(c, registry),
		V1_TIMEZONE,
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

	const data: Record<string, unknown> = withDerivedValues(credentialType ?? '', {
		...(registry.get(credentialType ?? '')?.defaults ?? {}),
		...c.credential?.data,
	});
	if (compiled.derivations.length > 0) {
		const derived: Record<string, unknown> = isRecord(data.n8nDerived)
			? { ...data.n8nDerived }
			: {};
		for (const { name, code } of compiled.derivations) {
			const value = evaluateDerivation(code, data);
			if (value === undefined)
				return `a derived credential value is not text: ${code.slice(0, 80)}`;
			derived[name] = value;
		}
		data.n8nDerived = derived;
	}
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
					basicAuth: args.basicAuth,
					inject: args.inject,
				},
				inject,
				data,
			),
		);
		const type = request.headers['content-type'] ?? '';
		if (type.startsWith('application/x-www-form-urlencoded') && typeof request.body === 'string') {
			const { 'content-type': _type, ...headers } = request.headers;
			return {
				...request,
				headers,
				body: { $form: Object.fromEntries(new URLSearchParams(request.body)) },
			};
		}
		return request;
	});
	const expected = v1.requests.map(({ qsFormat: _, ...r }) => {
		const form = isRecord(r.body) ? r.body.$form : undefined;
		if (!isRecord(form)) return r;
		const text: Record<string, string> = {};
		for (const [key, value] of Object.entries(form)) {
			if (value !== undefined)
				text[key] = value === null ? '' : typeof value === 'string' ? value : JSON.stringify(value);
		}
		const { 'content-type': _type, ...headers } = r.headers;
		return { ...r, headers, body: { $form: text } };
	});
	if (JSON.stringify(requests) !== JSON.stringify(expected)) {
		if (requests.length !== expected.length) {
			const cause = v1.error === undefined ? '' : `; v1 fails: ${v1.error.slice(0, 90)}`;
			return `the requests differ: count ${requests.length} / ${expected.length}${cause}`;
		}
		for (let k = 0; k < requests.length; k++) {
			const mine: Record<string, unknown> = { ...requests[k] };
			const theirs: Record<string, unknown> = { ...expected[k] };
			for (const part of ['method', 'url', 'qs', 'headers', 'body', 'basicAuth']) {
				const a = JSON.stringify(mine[part]);
				const b = JSON.stringify(theirs[part]);
				if (a !== b)
					return `the requests differ: ${part} ${String(a).slice(0, 70)} / ${String(b).slice(0, 70)}`;
			}
		}
		return 'the requests differ';
	}
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
