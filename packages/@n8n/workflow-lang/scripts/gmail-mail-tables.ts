/**
 * Prints the data tables of the mail parser of the Gmail library node (`src/nodes/gmail.ts`):
 * the character classes and the TLD list of linkify-it as mailparser configures it, and the
 * named character references that `he` writes. The source is the packages that the v1 node
 * loads. Paste the output over the block between `// tables:start` and `// tables:end`.
 *
 * Usage: node scripts/gmail-mail-tables.ts
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

import { DEFAULT_NODE_PACKAGES } from '../src/credentials/types.ts';

const nodesBase = createRequire(join(DEFAULT_NODE_PACKAGES[0], 'package.json'));
const req = createRequire(nodesBase.resolve('mailparser'));

interface Linkify {
	re: Record<string, string | RegExp>;
	tlds(list: string[] | string, keep?: boolean): Linkify;
	add(schema: string, definition: unknown): Linkify;
	set(options: Record<string, boolean>): Linkify;
}

const linkify = (req('linkify-it') as () => Linkify)();
linkify
	.tlds(req('tlds') as string[])
	.tlds('onion', true)
	.add('git:', 'http:')
	.add('ftp:', null)
	.set({ fuzzyIP: true, fuzzyLink: true, fuzzyEmail: true });

const heSource = readFileSync(req.resolve('he'), 'utf8');
const mapText = /var encodeMap = (\{.*?\});/.exec(heSource)?.[1];
const regexText = /var regexEncodeNonAscii = (\/.*\/g);/.exec(heSource)?.[1];
if (mapText === undefined || regexText === undefined) throw new Error('he: the tables moved');
const literal = (text: string): unknown => runInNewContext(`(${text})`);
const encodeMap = literal(mapText) as Record<string, string>;
const nonAscii = literal(regexText) as RegExp;
const whole = new RegExp(`^(?:${nonAscii.source})$`);
const names = Object.keys(encodeMap)
	.filter((key) => whole.test(key))
	.sort()
	.map((key) => `\u0001${key}\u0002${encodeMap[key]}`)
	.join('');

const text = (value: string | RegExp): string =>
	JSON.stringify(typeof value === 'string' ? value : value.source);

console.log(
	[
		'// tables:start (scripts/gmail-mail-tables.ts)',
		`const UC_ANY = ${text(linkify.re.src_Any)};`,
		`const UC_CC = ${text(linkify.re.src_Cc)};`,
		`const UC_Z = ${text(linkify.re.src_Z)};`,
		`const UC_P = ${text(linkify.re.src_P)};`,
		`const LINK_TLDS = ${text(linkify.re.src_tlds)};`,
		`const HE_NAMES = ${JSON.stringify(names)};`,
		'// tables:end',
	].join('\n'),
);
