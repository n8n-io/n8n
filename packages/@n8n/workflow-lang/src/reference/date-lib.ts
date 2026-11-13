/**
 * The Date library functions of spec section 4.5, for the TypeScript test
 * VM. A Date is a number here, as in the runtime. Each function uses a
 * JavaScript Date in UTC, so the results are those of Node.js.
 */
import { zoneOffset } from './zone-lib.ts';
import { useUtc } from './runner.ts';

const PROTO = 'Date.prototype.';

function receiver(name: string, v: unknown): Date {
	if (typeof v === 'number') return new Date(v);
	if (v === null || v === undefined) {
		throw new TypeError(`Cannot read properties of ${String(v)} (reading '${name}')`);
	}
	throw new TypeError('this is not a Date object.');
}

function locale(d: Date, method: string): string {
	if (method === 'toLocaleDateString') return d.toLocaleDateString('en-US');
	if (method === 'toLocaleTimeString') return d.toLocaleTimeString('en-US');
	return d.toLocaleString('en-US');
}

/** `new Date(v)` with one argument, with the JavaScript conversions of `v`. */
function fromValue(v: unknown): number {
	const d: Date = Reflect.construct(Date, [v]);
	return d.getTime();
}

/** Calls the Date library function `name`. Returns undefined for other names. */
export function callDate(name: string, args: unknown[]): { value: unknown } | undefined {
	useUtc();
	const n = (i: number) => Number(args[i]);
	switch (name) {
		case 'Date.fromValue':
			return { value: fromValue(args[0]) };
		case 'Date.fromParts': {
			const d: Date = Reflect.construct(Date, args.map(Number));
			return { value: d.getTime() };
		}
		case 'Date.UTC': {
			const p = args.map(Number);
			return { value: p.length === 0 ? Number.NaN : Reflect.apply(Date.UTC, undefined, p) };
		}
		case 'Date.parse':
			return { value: Date.parse(String(args[0])) };
		case 'Date.zoneOffset':
			return { value: zoneOffset(String(args[0]), Number(args[1])) };
		case 'Date.json':
			return { value: typeof args[0] === 'number' ? new Date(args[0]).toJSON() : args[0] };
		case 'Date.text':
			return {
				value: typeof args[0] === 'number' ? new Date(args[0]).toString() : String(args[0]),
			};
		default:
			break;
	}
	if (!name.startsWith(PROTO)) return undefined;
	const method = name.slice(PROTO.length);
	const d = receiver(method, args[0]);
	const rest = args.slice(1).map((_, i) => n(i + 1));
	if (method.startsWith('toLocale')) return { value: locale(d, method) };
	const fn: unknown = Reflect.get(d, method);
	if (typeof fn !== 'function') throw new Error(`unknown Date method ${method}`);
	// toISOString throws a RangeError; the test VM turns it into a plain error.
	return { value: Reflect.apply(fn, d, rest) };
}
