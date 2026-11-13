/**
 * The optional and extra parameters of the library methods (lib-dts.ts), each with
 * positions that are missing, negative, fractional, out of range, NaN and not numbers.
 * The runtime gives V8's results.
 */
import { webhook, workflow } from '@n8n/workflow-lang';

type Json = any;

export default workflow({
	triggers: [webhook({ path: 'optional' })],
	async run(ctx, trigger) {
		const body: Json = trigger.body;
		const nan: Json = 0 / 0;
		const missing: Json = body.missing;
		const ps: Json[] = [...body.positions, nan, missing];
		const texts: Json[] = body.texts;
		const list: Json[] = body.list;
		const nul: Json = null;
		const one: Json = 1;
		const strings = texts.map((s: Json) => ({
			startsWith: ps.map((p: Json) => [
				s.startsWith('a', p),
				s.startsWith('bc', p),
				s.startsWith('', p),
			]),
			endsWith: ps.map((p: Json) => [s.endsWith('c', p), s.endsWith('ab', p), s.endsWith('', p)]),
			includes: ps.map((p: Json) => [s.includes('a', p), s.includes('😀', p), s.includes('', p)]),
			indexOf: ps.map((p: Json) => [s.indexOf('a', p), s.indexOf('c', p), s.indexOf('', p)]),
			slice: ps.map((p: Json) => [s.slice(p), s.slice(0, p), s.slice(p, -1)]),
			substring: ps.map((p: Json) => [s.substring(p), s.substring(1, p)]),
			split: ps.map((p: Json) => [s.split('b', p), s.split('', p)]),
			padStart: ps.map((p: Json) => [s.padStart(p), s.padStart(8, p), s.padStart(9, 'xy')]),
			padEnd: ps.map((p: Json) => [s.padEnd(p), s.padEnd(8, p), s.padEnd(9, 'xy')]),
			charAt: ps.map((p: Json) => s.charAt(p)),
			charCodeAt: ps.map((p: Json) => s.charCodeAt(p)),
			at: ps.map((p: Json) => s.at(p)),
			concat: [s.concat(), s.concat(1, null, missing, 'z')],
		}));
		const numbers = [0, 1.005, -12.345, 255, 1e21, 0.000001234].map((n: number) => ({
			toFixed: [
				n.toFixed(),
				n.toFixed(0),
				n.toFixed(2),
				n.toFixed(missing),
				n.toFixed(1.7),
				n.toFixed(Number('3')),
			],
			toString: [
				n.toString(),
				n.toString(missing),
				n.toString(2),
				n.toString(16),
				n.toString(36),
				n.toString(10.5),
			],
		}));
		const arrays = {
			slice: ps.map((p: Json) => [list.slice(p), list.slice(0, p), list.slice(p, -1)]),
			join: [
				list.join(),
				list.join(missing),
				list.join(''),
				list.join('-'),
				list.join(nul),
				list.join(one),
			],
			includes: ps.map((p: Json) => [
				list.includes(1, p),
				list.includes(null, p),
				list.includes(3, p),
			]),
			indexOf: ps.map((p: Json) => [list.indexOf(1, p), list.indexOf(null, p), list.indexOf(3, p)]),
			at: ps.map((p: Json) => list.at(p)),
			flat: [[[1, [2]], [3]].flat(), [[1, [2]], [3]].flat(1)],
			concat: [list.concat(), list.concat(4, [5, [6]], missing)],
			push: [[1].push(), [1].push(2, 3)],
			unshift: [[1].unshift(), [1].unshift(2, 3)],
			sort: [
				[...list].sort(),
				[10, 9, 1, 100].sort(),
				[10, 9, 1, 100].sort((a: Json, b: Json) => a - b),
			],
		};
		const json = {
			stringify: [
				JSON.stringify(list),
				JSON.stringify(list, null),
				JSON.stringify({ a: [1, { b: 2 }] }, null, 2),
				JSON.stringify({ a: [1, { b: 2 }] }, null, 20),
				JSON.stringify({ a: [1, { b: 2 }] }, null, -1),
				JSON.stringify({ a: [1, { b: 2 }] }, null, 1.9),
				JSON.stringify({ a: [1, { b: 2 }] }, null, '--'),
				JSON.stringify({ a: [1, { b: 2 }] }, null, 'abcdefghijklmnop'),
				JSON.stringify({ a: [1, { b: 2 }] }, null, ''),
				JSON.stringify({ a: [] }, null, 2),
				JSON.stringify({ a: {} }, null, 2),
				JSON.stringify({ a: [1, { b: 2 }] }, missing, missing),
			],
		};
		const t = Date.UTC(2024, 0, 31, 10, 20, 30, 400);
		const d0 = new Date(t);
		const r0 = d0.setUTCSeconds(5);
		const d1 = new Date(t);
		const r1 = d1.setUTCSeconds(5, 999);
		const d2 = new Date(t);
		const r2 = d2.setUTCMinutes(70);
		const d3 = new Date(t);
		const r3 = d3.setUTCMinutes(1, 2, 3);
		const d4 = new Date(t);
		const r4 = d4.setUTCHours(1);
		const d5 = new Date(t);
		const r5 = d5.setUTCHours(1, 2);
		const d6 = new Date(t);
		const r6 = d6.setUTCHours(1, 2, 3, 4);
		const d7 = new Date(t);
		const r7 = d7.setUTCMonth(1);
		const d8 = new Date(t);
		const r8 = d8.setUTCMonth(1, 15);
		const d9 = new Date(t);
		const r9 = d9.setUTCFullYear(2023);
		const d10 = new Date(t);
		const r10 = d10.setUTCFullYear(2023, 5);
		const d11 = new Date(t);
		const r11 = d11.setUTCFullYear(2023, 5, 31);
		const d12 = new Date(t);
		const r12 = d12.setUTCSeconds(missing);
		const l0 = new Date(2024, 0);
		const l1 = new Date(2024, 0, 31, 10);
		const l2 = new Date(2024, 0, 31, 10, 20, 30, 400);
		const l3 = new Date(t);
		const q3 = l3.setSeconds(5, 999);
		const l4 = new Date(t);
		const q4 = l4.setMinutes(1, 2, 3);
		const l5 = new Date(t);
		const q5 = l5.setHours(1, 2);
		const l6 = new Date(t);
		const q6 = l6.setMonth(1, 15);
		const l7 = new Date(t);
		const q7 = l7.setFullYear(2023, 5, 31);
		const local = [
			l0.getTime(),
			l1.getTime(),
			l2.getTime(),
			q3,
			q4,
			q5,
			q6,
			q7,
			l2.toLocaleDateString('en-US'),
		];
		const dates = {
			utc: [
				Date.UTC(2024),
				Date.UTC(2024, 1),
				Date.UTC(2024, 1, 30),
				Date.UTC(2024, 13, 1, 25, 61, 61, 1001),
				Date.UTC(99, 0),
			],
			setUTC: [
				[r0, d0.toISOString()],
				[r1, d1.toISOString()],
				[r2, d2.toISOString()],
				[r3, d3.toISOString()],
				[r4, d4.toISOString()],
				[r5, d5.toISOString()],
				[r6, d6.toISOString()],
				[r7, d7.toISOString()],
				[r8, d8.toISOString()],
				[r9, d9.toISOString()],
				[r10, d10.toISOString()],
				[r11, d11.toISOString()],
				[r12, d12.getTime()],
			],
		};
		const globals = {
			parseInt: [
				parseInt('ff', 16),
				parseInt('11', 2),
				parseInt('z', 36),
				parseInt('10', missing),
				parseInt('10', 0),
				parseInt('10', 1),
				parseInt('10', 37),
				parseInt('0x1f'),
				parseInt('0x1f', 16),
				parseInt('0x1f', 10),
				parseInt('12', 3.9),
			],
			minMax: [Math.min(), Math.max(), Math.min(3, 1, 2), Math.max(3, missing)],
			ctors: [Number(), String(), Boolean(), Number(missing), String(missing), Boolean(missing)],
			normalize: ['é'.normalize(), 'é'.normalize(missing)],
		};
		return { strings, numbers, arrays, json, dates, local, globals };
	},
});
