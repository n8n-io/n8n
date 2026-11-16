/**
 * The node compiler against v1: it compiles the n8n source of a node for the
 * parameters of each equivalence case, runs the result in the reference
 * runner and in the bytecode VM, and compares the requests and the output
 * with the recording of the v1 node (`src/nodes/__tests__/v1-requests.json`).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { getNodeParameters } from '../../convert/node-parameters.ts';
import { withDerivedValues } from '../../credentials/derived.ts';
import { deriveInject } from '../../credentials/inject.ts';
import { DEFAULT_NODE_PACKAGES, loadCredentialTypes, registryOf } from '../../credentials/types.ts';
import {
	NODE_DESCRIPTIONS,
	NODE_DESCRIPTION_VERSIONS,
} from '../../generated/node-descriptions.generated.ts';
import { EQUIVALENCE_CASES } from '../../nodes/__tests__/equivalence-cases.ts';
import type { EquivalenceCase, Recording } from '../../nodes/__tests__/equivalence.ts';
import { applyCredential, normalizeRequest } from '../../nodes/__tests__/equivalence.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import { specialiseNode } from '../specialise.ts';

const here = dirname(fileURLToPath(import.meta.url));
const nodesBase = join(here, '../../../../../nodes-base');
const recordings: Record<string, Recording> = JSON.parse(
	readFileSync(join(here, '../../nodes/__tests__/v1-requests.json'), 'utf8'),
);
const typesBuilt = existsSync(join(DEFAULT_NODE_PACKAGES[0], 'dist/known/credentials.json'));

/** The n8n source file of each node type that the node compiler is tested on. */
const ENTRIES: Record<string, string> = {
	'n8n-nodes-base.telegram': 'nodes/Telegram/Telegram.node.ts',
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function specialise(c: EquivalenceCase) {
	const description = NODE_DESCRIPTIONS[NODE_DESCRIPTION_VERSIONS[`${c.type}@${c.typeVersion}`]];
	// The parameters as n8n gives them to the node: with the defaults of the description.
	const parameters = getNodeParameters(
		description.properties,
		c.parameters,
		true,
		false,
		c.typeVersion,
		description,
	);
	return specialiseNode({
		type: c.type,
		version: c.typeVersion,
		entry: join(nodesBase, ENTRIES[c.type]),
		readFile: (path) => (existsSync(path) ? readFileSync(path, 'utf8') : undefined),
		parameters: isRecord(parameters) ? parameters : {},
		aliases: { '@utils/': `${join(nodesBase, 'utils')}/` },
	});
}

function workflowSource(c: EquivalenceCase): string {
	return `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'equivalence' })],
	credentials: { c: { type: ${JSON.stringify(c.credential?.type)} } },
	async run(ctx) {
		return await ctx.node({
			name: 'Node',
			type: ${JSON.stringify(c.type)},
			typeVersion: ${c.typeVersion},
			parameters: ${JSON.stringify(c.parameters)},
			${c.items ? `items: ${JSON.stringify(c.items)},` : ''}
			credential: 'c',
		});
	},
});
`;
}

const cases = EQUIVALENCE_CASES.filter((c) => c.type in ENTRIES && c.expectedError === undefined);

describe.runIf(typesBuilt)('node compiler: n8n node source against v1', () => {
	const registry = registryOf(loadCredentialTypes().types);

	it('has cases', () => {
		expect(cases.length).toBeGreaterThan(0);
	});

	describe.each(cases.map((c) => ({ ...c, label: c.name })))('$label', (c) => {
		const result = specialise(c);
		const nodes = { 'nodes/compiled-node.ts': result.source ?? '' };
		const fixture = {
			trigger: { body: {}, headers: {}, query: {} },
			now: 0,
			seed: 1,
			effects: { Node: c.responses.map((r) => ({ status: 200, headers: {}, ...r })) },
		};

		it('compiles the node source without errors', () => {
			expect(result.errors).toEqual([]);
			expect(compile(workflowSource(c), { nodes }).diagnostics).toEqual([]);
		});

		it('keeps only the code of the operation in use', () => {
			// The Telegram node has 2,500 lines and 30 operations.
			expect((result.source ?? '').split('\n').length).toBeLessThan(200);
			expect(result.source).not.toContain('this.');
		});

		it('sends the requests of v1 and gives its output', async () => {
			const out = await runReference(workflowSource(c), fixture, { nodes });
			expect(out.status).toBe('ok');
			const data = withDerivedValues(c.credential?.type ?? '', {
				...(registry.get(c.credential?.type ?? '')?.defaults ?? {}),
				...c.credential?.data,
			});
			const inject = deriveInject(registry, c.credential?.type ?? '', data).inject;
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
			const recording = recordings[c.name];
			expect(requests).toEqual(recording.requests.map(({ qsFormat: _, ...r }) => r));
			expect(out.result).toEqual(recording.output);
		});

		it('gives the same result from the bytecode as from the reference runner', async () => {
			const compiled = compile(workflowSource(c), { nodes });
			const reference = await runReference(workflowSource(c), fixture, { nodes });
			const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
			expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
		});
	});
});
