/**
 * Native lowering of the Crypto node, action `hash` only, with a text value.
 * Hmac, sign, generate, encrypt, decrypt and binary input stay in the host.
 */
import type { Code } from './code.ts';
import { literal, str } from './code.ts';
import type { NodeContext } from './context.ts';
import { NodeFailure } from './context.ts';
import { ITEM, INDEX, isExpression } from './expression.ts';
import { text } from './types.ts';

function flat(code: Code): string {
	if (code.kind === 'raw') return code.text;
	if (code.kind === 'array') return `[${code.items.map(flat).join(', ')}]`;
	return `{ ${code.entries.map(([k, v]) => `${str(k)}: ${flat(v)}`).join(', ')} }`;
}

const mapParams = (index: boolean) =>
	index ? `(${ITEM}: Json, ${INDEX}: number)` : `(${ITEM}: Json)`;

/** The hash algorithms that the runtime digest helpers can compute, in their lower-case form. */
const CRYPTO_HASHES = new Set(['md5', 'sha1', 'sha256', 'sha384', 'sha512']);

export function lowerCrypto(c: NodeContext): void {
	const p = c.parameters;
	const action = text(p.action, 'hash');
	if (action !== 'hash') {
		throw new NodeFailure('crypto-action', `The action "${action}" is not proven.`, 'action');
	}
	if (p.binaryData === true) {
		throw new NodeFailure('crypto-binary', 'Binary input is not supported.', 'binaryData');
	}
	const typeName = text(p.type, c.version === 1 ? 'MD5' : 'SHA256');
	if (isExpression(p.type)) {
		throw new NodeFailure('expression', 'The hash type is an expression.', 'type');
	}
	const alg = typeName.toLowerCase();
	if (!CRYPTO_HASHES.has(alg)) {
		throw new NodeFailure('crypto-type', `The hash type "${typeName}" has no digest.`, 'type');
	}
	const encoding = text(p.encoding, 'hex');
	if (encoding !== 'hex' && encoding !== 'base64') {
		throw new NodeFailure('crypto-encoding', `The encoding "${encoding}" is not proven.`, 'encoding');
	}
	const dataPropertyName = text(p.dataPropertyName, 'data');
	if (isExpression(p.dataPropertyName)) {
		throw new NodeFailure('expression', 'The property name is an expression.', 'dataPropertyName');
	}
	const usage = { item: false, index: false };
	const rawValue = p.value === undefined ? '' : p.value;
	let valueCode: string;
	if (isExpression(rawValue)) {
		const t = c.compiled(rawValue, 'value');
		usage.item ||= t.usage.item;
		usage.index ||= t.usage.index;
		valueCode = flat(t.code);
	} else {
		valueCode = flat(literal(rawValue));
	}
	const out = c.output(0);
	const w = c.w;
	c.helper('copyJson');
	c.helper('hashDigest');
	c.helper('utf8Bytes');
	c.helper('hashArgument');
	const params = mapParams(usage.index);
	w.open(`const ${out}: Json[] = ${c.input}.map(${params} => {`);
	w.line(`const item: Json = copyJson(${ITEM});`);
	w.line(
		`item[${str(dataPropertyName)}] = hashDigest({ $hash: ${str(alg)}, key: null, data: utf8Bytes(hashArgument(${valueCode}, 'data', 'Buffer, TypedArray, or DataView')), done: false }, ${str(encoding)});`,
	);
	w.line('return item;');
	w.close('});');
}
