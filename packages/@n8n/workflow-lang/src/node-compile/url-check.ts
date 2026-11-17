import { runInThisContext } from 'node:vm';
import ts from 'typescript';

import { targetIsProcess } from '../convert/node-identity.ts';

export const URL_PATH_ESCAPES_CARET: boolean = new URL('https://a/^').pathname === '/%5E';

export const URL_PROBES: readonly string[] = [
	'https://example.com',
	'HTTPS://Example.COM/Path?Query=1#Hash',
	'http://example.com:80/',
	'https://example.com:0443/x',
	'http://example.com:65536',
	'http://example.com:8a',
	'http://',
	'http:example.com',
	'http:////example.com//a//b',
	'http:\\\\example.com\\a\\b',
	'https://example.com/a/./b/../c',
	'https://example.com/a/%2e%2E/b/%2e',
	'https://example.com/a b/"c"<d>`e`{f}^g|h',
	"https://example.com/p!$&'()*+,;=:@[]~_-.",
	'https://example.com/?a=1&a=2&b+c=x%20y',
	'https://example.com/?a=\'q\' "r"<s>`t`{u}^v|w',
	'https://example.com/?',
	'https://example.com/#',
	'https://example.com#a b"<>`{}^|',
	'https://example.com/?a=1#frag?x=2',
	'https://sub_domain.example-site.co.uk/x',
	'https://192.168.1.10:8443/api',
	'https://1.2.3.example/',
	'  https://example.com/a  ',
	'\thttps://exa\nmple.com/a\r\n',
	'https://exa mple.com/',
	'https://exa<mple.com/',
	'https://exa|mple.com/',
	'https://exa^mple.com/',
	'https://example.com/\u0001\u001f\u007f',
	'https://example.com/%zz?a=%41',
	'bareId_123-x',
	'',
	'//example.com/x',
	'1http://example.com',
];

type Outcome = string[] | 'stops';

const FIELDS = [
	'href',
	'origin',
	'protocol',
	'host',
	'hostname',
	'port',
	'pathname',
	'search',
	'hash',
] as const;

function ofNode(text: string): Outcome {
	try {
		const url = new URL(text);
		return FIELDS.map((name) => url[name]);
	} catch (error) {
		return error instanceof Error ? [error.name, error.message] : ['?'];
	}
}

function ofHelper(read: (input: unknown) => unknown, text: string): Outcome {
	try {
		const url = read(text);
		if (typeof url !== 'object' || url === null) return ['?'];
		return FIELDS.map((name) => String(Reflect.get(url, name)));
	} catch (error) {
		if (!(error instanceof Error)) return ['?'];
		return error.message.includes('has no compiled form') ? 'stops' : [error.name, error.message];
	}
}

export function urlHelperDiffers(helperSources: string[]): string | undefined {
	const js = ts.transpileModule(
		`(function () {\n${helperSources.join('\n')}\nreturn __url;\n})()`,
		{
			compilerOptions: { target: ts.ScriptTarget.ES2022 },
		},
	).outputText;
	const read: unknown = runInThisContext(js);
	if (typeof read !== 'function') return '';
	const call = (input: unknown): unknown => Reflect.apply(read, undefined, [input]);
	return URL_PROBES.find((text) => {
		const ours = ofHelper(call, text);
		return ours !== 'stops' && JSON.stringify(ours) !== JSON.stringify(ofNode(text));
	});
}

let fits: boolean | undefined;

export function urlHelperFits(helperSources: string[]): boolean {
	if (!targetIsProcess()) return false;
	fits ??= urlHelperDiffers(helperSources) === undefined;
	return fits;
}
