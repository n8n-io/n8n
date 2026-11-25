import { toWellFormed } from './utf8';

const SCHEME_AND_TEXT_BEFORE_QUERY = /^([a-z][a-z\d+.-]*):([^?#]*)/i;
const SCHEME_WITH_AUTHORITY = /^(?:https?|wss?|ftp)$/;
const SLASH = /[/\\]/;
// The host is an IPv6 address between square brackets, or has no colon.
const HOST_AND_PORT = /^(\[[^\]]*\]|[^:[\]]*)(?::(\d*))?$/;
const PATH_CHARACTERS_TO_ENCODE = /[\0- "<>^`{}\x7f-\u{10ffff}]/gu;
const OPAQUE_PATH_CHARACTERS_TO_ENCODE = /[\0-\x1f\x7f-\u{10ffff}]/gu;
const FORBIDDEN_DOMAIN_CHARACTER = /[\0- #%/:<>?@[\\\]^|\x7f]/;
const FORBIDDEN_HOST_CHARACTER = /[\0 <>\\^|]/;
const NUMBER_LABEL = /^(?:\d+|0x[\da-f]*)$/i;
const IPV4_AT_END_OF_IPV6 = /(?<start>^|:)(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?!$)|$)){4}$/;
const IPV6 = /^(?:[\da-f]{1,4}(?::[\da-f]{1,4})*)?(::(?:[\da-f]{1,4}(?::[\da-f]{1,4})*)?)?$/i;
const SINGLE_DOT_SEGMENT = /^(?:\.|%2e)$/i;
const DOUBLE_DOT_SEGMENT = /^(?:\.|%2e){2}$/i;
const DRIVE_LETTER = /^([a-z])[:|]$/i;
const MAX_PORT = 65535;
const MAX_IPV4_PART = 255;
const LAST_CONTROL_OR_SPACE = 0x20;

/** Removes the characters that the URL parser ignores. Replaces each lone surrogate with U+FFFD. */
const toParserInput = (value: string) => {
	const text = toWellFormed(value).replace(/[\t\n\r]/g, '');
	let start = 0;
	let end = text.length;
	// A regex that ends with `+$` takes quadratic time on long runs of spaces.
	while (text.charCodeAt(start) <= LAST_CONTROL_OR_SPACE) {
		start++;
	}
	while (text.charCodeAt(end - 1) <= LAST_CONTROL_OR_SPACE) {
		end--;
	}
	return text.slice(start, end);
};

/** Percent-encodes the UTF-8 bytes of each matching character. The text must have no lone surrogate. */
const percentEncode = (text: string, charactersToEncode: RegExp) =>
	text.replace(charactersToEncode, (character) => encodeURIComponent(character));

/** Returns the value of a part of an IPv4 address, or `NaN` when the part is not a number. */
const ipv4PartValue = (part: string) => {
	if (/^0x[\da-f]*$/i.test(part)) {
		return parseInt(`${part}0`, 16) / 16;
	}
	if (/^0[0-7]*$/.test(part)) {
		return parseInt(part, 8);
	}
	return /^[1-9]\d*$/.test(part) ? Number(part) : NaN;
};

const isIpv4Address = (labels: string[]) => {
	const values = labels.map(ipv4PartValue);
	return (
		values.length <= 4 &&
		values.every((value, index) =>
			index < values.length - 1 ? value <= MAX_IPV4_PART : value < 256 ** (5 - values.length),
		)
	);
};

/** Does not do the IDNA validation of a domain. A domain that ends in a number must be an IPv4 address. */
const isValidDomain = (host: string) => {
	try {
		const domain = decodeURIComponent(host);
		const labels = domain.replace(/\.$/, '').split('.');
		return (
			!FORBIDDEN_DOMAIN_CHARACTER.test(domain) &&
			(!NUMBER_LABEL.test(labels[labels.length - 1]) || isIpv4Address(labels))
		);
	} catch {
		return false;
	}
};

const isIpv6Address = (address: string) => {
	// An IPv4 address at the end fills two 16-bit pieces.
	const pieces = address.replace(IPV4_AT_END_OF_IPV6, '$<start>0:0');
	const match = IPV6.exec(pieces);
	const pieceCount = pieces.split(':').filter(Boolean).length;
	const isCompressed = match?.[1] !== undefined;
	return match !== null && (isCompressed ? pieceCount <= 7 : pieceCount === 8);
};

const isValidHost = (host: string, hasSpecialScheme: boolean) => {
	if (host.startsWith('[')) {
		return host.endsWith(']') && isIpv6Address(host.slice(1, -1));
	}
	return hasSpecialScheme ? isValidDomain(host) : !FORBIDDEN_HOST_CHARACTER.test(host);
};

/**
 * Returns the path of a text that is a list of segments.
 * The path has no `.` and `..` segments, and its characters are percent-encoded.
 */
const segmentsPathname = (text: string, hasSpecialScheme: boolean, isFile = false) => {
	const segments = percentEncode(text, PATH_CHARACTERS_TO_ENCODE).split(
		hasSpecialScheme ? SLASH : '/',
	);
	const path: string[] = [];

	segments.forEach((segment, index) => {
		const isDoubleDot = DOUBLE_DOT_SEGMENT.test(segment);
		const isDot = isDoubleDot || SINGLE_DOT_SEGMENT.test(segment);
		// A file URL keeps its drive letter.
		if (isDoubleDot && !(isFile && path.length === 1 && /^[a-z]:$/i.test(path[0]))) {
			path.pop();
		}
		if (isDot && index === segments.length - 1) {
			path.push('');
		}
		if (!isDot) {
			path.push(isFile && path.length === 0 ? segment.replace(DRIVE_LETTER, '$1:') : segment);
		}
	});

	return `/${path.join('/')}`;
};

/** Returns the path of a text that starts with `user:password@host:port`, or `undefined` for an authority that is not valid. */
const pathnameAfterAuthority = (text: string, hasSpecialScheme: boolean) => {
	const authorityEnd = text.search(hasSpecialScheme ? SLASH : '/');
	const authority = authorityEnd === -1 ? text : text.slice(0, authorityEnd);
	const afterAuthority = text.slice(authority.length);
	const hostAndPort = authority.slice(authority.lastIndexOf('@') + 1);
	const [, host, port] = HOST_AND_PORT.exec(hostAndPort) ?? [];
	const hostIsMissing =
		host === '' && (hasSpecialScheme || port !== undefined || authority.includes('@'));

	if (
		host === undefined ||
		hostIsMissing ||
		Number(port ?? 0) > MAX_PORT ||
		!isValidHost(host, hasSpecialScheme)
	) {
		return undefined;
	}
	return hasSpecialScheme || afterAuthority
		? segmentsPathname(afterAuthority.slice(1), hasSpecialScheme)
		: '';
};

/** Returns the path of the text that follows `file:`, or `undefined` for a host that is not valid. */
const filePathname = (text: string) => {
	const [, hostSlashes, host, afterHost] = /^([/\\]{2})?([^/\\]*)([^]*)$/.exec(text) ?? [];
	// A drive letter in the position of the host is the start of the path.
	if (!hostSlashes || DRIVE_LETTER.test(host)) {
		return segmentsPathname(
			(hostSlashes ? host + afterHost : text).replace(/^[/\\]/, ''),
			true,
			true,
		);
	}
	if (host !== '' && !isValidHost(host, true)) {
		return undefined;
	}
	return segmentsPathname(afterHost.slice(1), true, true);
};

/**
 * Returns the path that `new URL(value).pathname` returns, or `undefined` when the URL is not valid.
 * Follows the URL Standard (https://url.spec.whatwg.org/#concept-basic-url-parser).
 * Does not do the IDNA validation of the host. Thus a host that is not ASCII can be accepted when `new URL()` throws.
 * A host that the IDNA mapping changes into an IPv4 address, such as `１.2`, is rejected when `new URL()` accepts it.
 * Node 24.15.0 differs in two more cases, and Node 26.12.1 does not: a host with an `xn--` label that is not valid, and a first segment of a file URL that starts with a drive letter, such as `C:x`, when `..` follows it.
 */
export function urlPathname(value: string): string | undefined {
	const [, anyCaseScheme, text] = SCHEME_AND_TEXT_BEFORE_QUERY.exec(toParserInput(value)) ?? [];
	if (anyCaseScheme === undefined) {
		return undefined;
	}

	const scheme = anyCaseScheme.toLowerCase();
	if (scheme === 'file') {
		return filePathname(text);
	}
	if (SCHEME_WITH_AUTHORITY.test(scheme)) {
		return pathnameAfterAuthority(text.replace(/^[/\\]*/, ''), true);
	}
	if (text.startsWith('//')) {
		return pathnameAfterAuthority(text.slice(2), false);
	}
	return text.startsWith('/')
		? segmentsPathname(text.slice(1), false)
		: percentEncode(text.replace(/ $/, '%20'), OPAQUE_PATH_CHARACTERS_TO_ENCODE);
}
