import { describe, it, expect } from 'vitest';

import { urlPathname } from '../url-pathname';

const nodePathname = (value: string) => {
	try {
		return new URL(value).pathname;
	} catch {
		return undefined;
	}
};

describe('urlPathname', () => {
	it.each([
		['https://example.com/path', '/path'],
		['https://example.com', '/'],
		['https://example.com/', '/'],
		['https://example.com/path?query=1#hash', '/path'],
		['https://example.com:8080/path', '/path'],
		['ftp://files.example.com/doc.pdf', '/doc.pdf'],
		['http://user:pass@example.com/path', '/path'],
		['https://example.com/a%2fb', '/a%2fb'],
		['https://example.com/a+b;c=d', '/a+b;c=d'],
		["https://example.com/a'b|c:d@e", "/a'b|c:d@e"],
	])('should keep the path of %j', (input, expected) => {
		expect(urlPathname(input)).toBe(expected);
	});

	it.each([
		['https://de.wikipedia.org/wiki/Käse', '/wiki/K%C3%A4se'],
		['https://example.com/my report.pdf', '/my%20report.pdf'],
		['https://example.com/a<b>c', '/a%3Cb%3Ec'],
		['https://example.com/😀', '/%F0%9F%98%80'],
		['https://example.com/a\uD800b', '/a%EF%BF%BDb'],
		['https://example.com/a^b`{}"', '/a%5Eb%60%7B%7D%22'],
	])('should percent-encode the path of %j', (input, expected) => {
		expect(urlPathname(input)).toBe(expected);
	});

	it.each([
		['https://example.com/v1/../v2/users', '/v2/users'],
		['https://example.com/a/./b', '/a/b'],
		['https://example.com/a/b/..', '/a/'],
		['https://example.com/a/b/.', '/a/b/'],
		['https://example.com/../a', '/a'],
		['https://example.com/a/%2E%2e/b', '/b'],
		['https://example.com/a/%2e/b', '/a/b'],
	])('should resolve the dot segments of %j', (input, expected) => {
		expect(urlPathname(input)).toBe(expected);
	});

	it.each([
		['https:\\\\example.com\\a\\b', '/a/b'],
		['http:example.com/path', '/path'],
		['http:/example.com', '/'],
		['  https://example.com/a\tb\nc  ', '/abc'],
		['HTTPS://EXAMPLE.COM/Path', '/Path'],
		['http://[::1]:8080/path', '/path'],
		['http://192.168.0.1/path', '/path'],
		['http://münchen.de/straße', '/stra%C3%9Fe'],
	])('should read %j like a browser', (input, expected) => {
		expect(urlPathname(input)).toBe(expected);
	});

	it.each([
		['mailto:me@example.com', 'me@example.com'],
		['data:text/plain,Käse', 'text/plain,K%C3%A4se'],
		['data:a b #fragment', 'a b%20'],
		['custom://host', ''],
		['custom://host/a b', '/a%20b'],
		['custom:/a/../b', '/b'],
	])('should give the path of %j, which has no special scheme', (input, expected) => {
		expect(urlPathname(input)).toBe(expected);
	});

	it.each([
		['file:///etc/hosts', '/etc/hosts'],
		['file:///C:/Users/../Windows', '/C:/Windows'],
		['file:///C|/Users', '/C:/Users'],
		['file://C:/Users', '/C:/Users'],
		['file:///C:/..', '/C:/'],
		['file://server/share/file.txt', '/share/file.txt'],
		['file://localhost/etc/hosts', '/etc/hosts'],
	])('should give the path of the file URL %j', (input, expected) => {
		expect(urlPathname(input)).toBe(expected);
	});

	it.each([
		[''],
		['not-a-url'],
		['/only/a/path'],
		['example.com/path'],
		[':://no-scheme'],
		['h$tp://example.com/path'],
		['ht tp://example.com/path'],
		['1http://example.com/path'],
		['https://'],
		['https://?query'],
		['https://user@/path'],
		['https://:8080/path'],
		['https://exa mple.com/path'],
		['https://exa<mple.com/path'],
		['https://example.com:port/path'],
		['https://example.com:65536/path'],
		['https://example.com:80:80/path'],
		['https://a%2Fb/path'],
		['https://%zz/path'],
		['http://%E9/path'],
		['http://%80.com/path'],
		['file://%E9/path'],
		['http://1.2.3.256/path'],
		['http://1.2.3.4.5/path'],
		['http://example.1/path'],
		['http://0x100000000/path'],
		['http://[::1/path'],
		['http://[1::2::3]/path'],
		['http://[::1]x/path'],
		['custom://ho st/path'],
		['file://host:80/path'],
	])('should return undefined for %j', (input) => {
		expect(urlPathname(input)).toBeUndefined();
	});

	it.each([
		['http://0x/'],
		['http://0x7f.1/'],
		['http://017700000001/'],
		['http://4294967295/'],
		['http://1.2.3.4./'],
		['http://1.2.3.4../'],
		['http://a..b/'],
		['http://example.0x1g/'],
		['http://example.com:/'],
		['http://example.com:0000000080/'],
		['http://@example.com/'],
		['http://a@b@example.com/'],
		['http://%65xample.com/'],
		['http://%C3%A9/path'],
		['custom://%E9/path'],
		['http://[1:2:3:4:5:6:7:8]/'],
		['http://[1:2:3:4:5:6:7::]/'],
		['http://[::]/'],
		['http://[::ffff:1.2.3.4]/'],
		['http://[1:2:3:4:5:6:1.2.3.4]/'],
		['http://[1:2:3:4:5:6:7:8:9]/'],
		['http://[1:2:3:4:5:6::1.2.3.4]/'],
		['http://[::1.2.3]/'],
		['http://[::1.2.3.04]/'],
		['http://[::1.2.3.4:5]/'],
		['http://[:1]/'],
		['http://[1:]/'],
		['http://[]/'],
		['http://[12345::]/'],
		['https:///example.com///a//b/'],
		['https://example.com?query'],
		['https://example.com#hash?not=query'],
		['custom://'],
		['custom://host?query'],
		['custom:///path'],
		['custom://:80/'],
		['custom://[::1]:80/path'],
		['custom:/.//path'],
		['custom:a/../b'],
		['a+b-c.d:path'],
		['c:\\Users\\me'],
		['data:two  spaces  ?query'],
		['file:'],
		['file:path/../other'],
		['file:/path'],
		['file:?query'],
		['file://c:'],
		['file://cc:/path'],
		['file://%43:/path'],
		['file://user@host/path'],
		['file:\\\\host\\share'],
		['file://host/c:/..'],
		['file:///../C|/path'],
		['\0 http://example.com/\0\x7F\xA0 '],
	])('should give the same result as `new URL()` for %j', (input) => {
		expect(urlPathname(input)).toBe(nodePathname(input));
	});

	it('should accept a host that the IDNA validation rejects', () => {
		expect(nodePathname('http://\u200d/path')).toBeUndefined();
		expect(urlPathname('http://\u200d/path')).toBe('/path');
	});

	it('should follow the URL Standard for a first segment that starts with a drive letter', () => {
		expect(urlPathname('file:///C:x/..')).toBe('/');
	});
});
