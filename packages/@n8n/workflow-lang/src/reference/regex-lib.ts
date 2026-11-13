/**
 * `RegExp.exec(source, flags, input, lastIndex)` of spec section 4.6, with the
 * JavaScript engine. The bytecode VM and the reference runner use it; the
 * runtime has its own engine (`workflow-runtime/src/core/regex.zig`).
 */
export function regexExec(
	source: unknown,
	flags: unknown,
	input: unknown,
	lastIndex: unknown,
): number[] | null {
	const f = String(flags);
	let re: RegExp;
	try {
		// `d` gives the positions of the groups; `g` searches from `lastIndex`.
		re = new RegExp(String(source), f.includes('y') ? `${f}d` : `${f.replace('g', '')}gd`);
	} catch {
		// oxlint-disable-next-line typescript/only-throw-error -- workflow errors are plain { name, message } objects.
		throw { name: 'SyntaxError', message: `Invalid regular expression: /${String(source)}/` };
	}
	const s = String(input);
	const last = Math.trunc(Number(lastIndex));
	if (!(last >= 0 && last <= s.length)) return null;
	re.lastIndex = last;
	const m = re.exec(s);
	// The `d` flag adds `indices`; the TypeScript library of this package does not declare it.
	const indices: unknown = m === null ? null : Reflect.get(m, 'indices');
	if (!Array.isArray(indices)) return null;
	return indices.flatMap((p: unknown) =>
		Array.isArray(p) ? [Number(p[0]), Number(p[1])] : [-1, -1],
	);
}
