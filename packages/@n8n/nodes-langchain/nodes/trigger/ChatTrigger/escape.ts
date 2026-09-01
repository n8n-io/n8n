// Escapes what would let a value break out of an inline <script> block: `<`/`>`
// to prevent `</script>` breakout, and U+2028/U+2029, which are valid in a JS
// string but were statement terminators to older engines.
const SCRIPT_CONTEXT_ESCAPES: Record<string, string> = {
	'<': '\\u003c',
	'>': '\\u003e',
	'&': '\\u0026',
	'\u2028': '\\u2028',
	'\u2029': '\\u2029',
};

// Returns a JSON literal safe to embed inside an inline <script> block. For string
// inputs the returned literal includes surrounding double quotes — do not add
// quotes at the call site.
export function escapeForScriptContext(value: string | object): string {
	return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (c) => SCRIPT_CONTEXT_ESCAPES[c]);
}
