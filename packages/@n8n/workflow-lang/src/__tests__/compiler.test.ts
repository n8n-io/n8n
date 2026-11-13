import { createHash } from 'node:crypto';

import { decodeModule } from '../compiler/decode.ts';
import { compile } from '../compiler/index.ts';
import { sha256 } from '../compiler/sha256.ts';
import { renderSources } from '../../scripts/generate-sources.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PACKAGE_ROOT, corpusCase } from './helpers.ts';

describe('sha256', () => {
	it.each([0, 1, 55, 56, 63, 64, 65, 1000])('matches node:crypto for %i bytes', (n) => {
		const data = new Uint8Array(n).map((_, i) => (i * 31 + 7) & 0xff);
		expect(Buffer.from(sha256(data)).toString('hex')).toBe(
			createHash('sha256').update(data).digest('hex'),
		);
	});
});

describe('generated sources', () => {
	it('are up to date', () => {
		expect(readFileSync(join(PACKAGE_ROOT, 'src/generated/sources.generated.ts'), 'utf8')).toBe(
			renderSources(),
		);
	});
});

describe('module content', () => {
	const result = compile(corpusCase('01-order-approval').source, { fileName: 'workflow.ts' });
	const m = decodeModule(result.module ?? new Uint8Array());

	it('records the steps', () => {
		expect(m.steps.map((s) => [s.name, s.kind])).toEqual([
			['Check stock', 1],
			['Approve short order', 4],
			['Reject', 5],
			['Charge', 1],
			['Confirm', 5],
			['Payment failed', 5],
		]);
	});

	it('records the trigger paths', () => {
		expect(m.paths).toEqual([
			'body.customer.id',
			'body.items[].price',
			'body.items[].qty',
			'body.items[].sku',
			'body.orderId',
		]);
	});

	it('records resume signatures with names and types', () => {
		const first = m.suspends[0];
		expect(first.step).toBe(0);
		const names = first.live.map((l) => l.name);
		expect(names).toEqual(expect.arrayContaining(['order', 'short', 'total', 'item']));
		expect(first.live.find((l) => l.name === 'short')?.type).toBe('string[]');
	});

	it('writes meta, manifest and source map', () => {
		expect(JSON.parse(m.meta)).toMatchObject({
			compilerVersion: '0.1.0',
			triggers: [{ kind: 'webhook', path: 'orders', method: 'POST' }],
			credentials: { payments: { type: 'httpHeaderAuth' } },
			durability: 'full',
		});
		expect(result.manifest).toMatchObject({
			native: true,
			credentials: [{ slot: 'payments', type: 'httpHeaderAuth' }],
		});
		expect(result.sourceMap?.functions[0].entries.length).toBeGreaterThan(0);
	});

	it('marks a module with a non-library node as not native', () => {
		const r = compile(corpusCase('06-effect-caught').source);
		expect(r.manifest?.native).toBe(false);
		expect(decodeModule(r.module ?? new Uint8Array()).native).toBe(false);
	});

	it('links library nodes under the step of the caller', () => {
		const r = compile(corpusCase('18-library-http').source);
		const d = decodeModule(r.module ?? new Uint8Array());
		const lib = d.functions.findIndex((f) => f.name === 'node:n8n-nodes-base.httpRequest');
		expect(lib).toBeGreaterThan(0);
		expect(d.suspends.filter((s) => s.func === lib).every((s) => s.step === null)).toBe(true);
		expect(r.manifest?.nodeTypes).toEqual([
			{ type: 'n8n-nodes-base.httpRequest', version: 4, library: true },
		]);
	});
});
