import { convertCurlToJson } from './convertCurl';

describe('convertCurl', () => {
	it('Should handle regular curl call', () => {
		const result = convertCurlToJson("curl 'localhost:2000'");

		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
		});
	});

	it('Should handle request methods', () => {
		const getResult = convertCurlToJson('curl -X GET http://localhost:2000');
		expect(getResult).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
		});

		const postResult = convertCurlToJson('curl --request POST http://localhost:2000');
		expect(postResult).toEqual({
			method: 'POST',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
		});

		const patchResult = convertCurlToJson('curl -X PATCH http://localhost:2000');
		expect(patchResult).toEqual({
			method: 'PATCH',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
		});
	});

	it('Should respect -X over -F', () => {
		const result = convertCurlToJson('curl -X PATCH -F d1="data1" http://localhost:2000');
		expect(result).toEqual({
			method: 'PATCH',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			data: { d1: 'data1' },
			headers: {
				'content-type': 'multipart/form-data',
			},
		});
	});

	it('Should respect --request over --form', () => {
		const result = convertCurlToJson(
			'curl --request PATCH --form d1="data1" http://localhost:2000',
		);
		expect(result).toEqual({
			method: 'PATCH',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			data: { d1: 'data1' },
			headers: {
				'content-type': 'multipart/form-data',
			},
		});
	});

	it('Should use POST when using --form without --request', () => {
		const result = convertCurlToJson('curl --form d1="data1" http://localhost:2000');
		expect(result).toEqual({
			method: 'POST',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			data: { d1: 'data1' },
			headers: {
				'content-type': 'multipart/form-data',
			},
		});
	});

	it('Should handle form data', () => {
		const result = convertCurlToJson('curl -F d1="data1" -F d2=data2 http://localhost:2000');
		expect(result).toEqual({
			method: 'POST',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			data: { d1: 'data1', d2: 'data2' },
			headers: {
				'content-type': 'multipart/form-data',
			},
		});
	});

	it('Should handle a single header with -H', () => {
		const result = convertCurlToJson(
			"curl -H 'content-type: application/json' http://localhost:2000",
		);
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			headers: { 'content-type': 'application/json' },
		});
	});

	it('Should handle a single header with --header', () => {
		const result = convertCurlToJson(
			"curl --header 'Authorization: Bearer token123' http://localhost:2000",
		);
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			headers: { Authorization: 'Bearer token123' },
		});
	});

	it('Should handle multiple headers', () => {
		const result = convertCurlToJson(
			"curl -H 'content-type: application/json' -H 'Accept: text/html' http://localhost:2000",
		);
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			headers: {
				'content-type': 'application/json',
				Accept: 'text/html',
			},
		});
	});

	it('Should preserve colons in header values', () => {
		const result = convertCurlToJson(
			"curl -H 'Authorization: Basic dXNlcjpwYXNz' http://localhost:2000",
		);
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			headers: { Authorization: 'Basic dXNlcjpwYXNz' },
		});
	});

	it('Should set header value to null when empty', () => {
		const result = convertCurlToJson("curl -H 'X-Custom-Header:' http://localhost:2000");
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			headers: { 'X-Custom-Header': null },
		});
	});

	it('Should handle basic auth with -u', () => {
		const result = convertCurlToJson('curl -u user:password http://localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			auth: { user: 'user', password: 'password' },
			auth_type: 'basic',
		});
	});

	it('Should handle basic auth with --user', () => {
		const result = convertCurlToJson('curl --user user:password http://localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			auth: { user: 'user', password: 'password' },
			auth_type: 'basic',
		});
	});

	it('Should handle passwords containing colons', () => {
		const result = convertCurlToJson('curl -u user:pass:with:colons http://localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			auth: { user: 'user', password: 'pass:with:colons' },
			auth_type: 'basic',
		});
	});

	it('Should handle digest auth', () => {
		const result = convertCurlToJson('curl --digest -u user:password http://localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			auth: { user: 'user', password: 'password' },
			auth_type: 'digest',
		});
	});

	it('Should handle ntlm auth', () => {
		const result = convertCurlToJson('curl --ntlm -u user:password http://localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			auth: { user: 'user', password: 'password' },
			auth_type: 'ntlm',
		});
	});

	it('Should handle negotiate auth', () => {
		const result = convertCurlToJson('curl --negotiate -u user:password http://localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			auth: { user: 'user', password: 'password' },
			auth_type: 'negotiate',
		});
	});

	it('Should handle aws-sigv4 auth', () => {
		const result = convertCurlToJson(
			"curl --aws-sigv4 'aws:amz:us-east-1:s3' http://localhost:2000",
		);
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			auth_type: 'aws-sigv4',
			aws_sigv4: 'aws:amz:us-east-1:s3',
		});
	});

	it('Should handle bearer auth via --oauth2-bearer', () => {
		const result = convertCurlToJson('curl --oauth2-bearer mytoken http://localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			auth_type: 'bearer',
		});
	});

	it('Should parse a single query param from the URL', () => {
		const result = convertCurlToJson("curl 'http://localhost:2000/search?q=hello'");
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000/search',
			raw_url: 'http://localhost:2000/search?q=hello',
			queries: { q: 'hello' },
		});
	});

	it('Should parse multiple query params from the URL', () => {
		const result = convertCurlToJson("curl 'http://localhost:2000?foo=1&bar=2'");
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000?foo=1&bar=2',
			queries: { foo: '1', bar: '2' },
		});
	});

	it('Should collect repeated query params into an array', () => {
		const result = convertCurlToJson("curl 'http://localhost:2000?tag=a&tag=b&tag=c'");
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000?tag=a&tag=b&tag=c',
			queries: { tag: ['a', 'b', 'c'] },
		});
	});

	it('Should not set queries when there are no query params', () => {
		const result = convertCurlToJson('curl http://localhost:2000/path');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000/path',
			raw_url: 'http://localhost:2000/path',
		});
		expect(result.queries).toBeUndefined();
	});

	it('Should handle follow redirects with -L', () => {
		const result = convertCurlToJson('curl -L http://localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			follow_redirects: true,
		});
	});

	it('Should handle follow redirects with --location', () => {
		const result = convertCurlToJson('curl --location http://localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			follow_redirects: true,
		});
	});

	it('Should handle max redirects', () => {
		const result = convertCurlToJson('curl -L --max-redirs 5 http://localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			follow_redirects: true,
			max_redirects: 5,
		});
	});

	it('Should handle connect timeout', () => {
		const result = convertCurlToJson('curl --connect-timeout 30 http://localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			connect_timeout: 30,
		});
	});

	it('Should handle insecure with -k', () => {
		const result = convertCurlToJson('curl -k http://localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			insecure: true,
		});
	});

	it('Should handle insecure with --insecure', () => {
		const result = convertCurlToJson('curl --insecure http://localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			insecure: true,
		});
	});

	it('Should handle include with -i', () => {
		const result = convertCurlToJson('curl -i http://localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			include: true,
		});
	});

	it('Should handle include with --include', () => {
		const result = convertCurlToJson('curl --include http://localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			include: true,
		});
	});

	it('Should handle proxy with -x', () => {
		const result = convertCurlToJson('curl -x http://proxy:8080 http://localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			proxy: 'http://proxy:8080',
		});
	});

	it('Should handle proxy with --proxy', () => {
		const result = convertCurlToJson('curl --proxy http://proxy:8080 http://localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			proxy: 'http://proxy:8080',
		});
	});

	it('Should handle output with -o', () => {
		const result = convertCurlToJson('curl -o response.json http://localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			output: 'response.json',
		});
	});

	it('Should handle output with --output', () => {
		const result = convertCurlToJson('curl --output response.json http://localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			output: 'response.json',
		});
	});

	it('Should handle URL via --url flag', () => {
		const result = convertCurlToJson('curl --url http://localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
		});
	});

	it('Should handle --url with query params', () => {
		const result = convertCurlToJson("curl --url 'http://localhost:2000?foo=bar'");
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000?foo=bar',
			queries: { foo: 'bar' },
		});
	});

	it('Should handle --url with localhost shorthand', () => {
		const result = convertCurlToJson('curl --url localhost:2000');
		expect(result).toEqual({
			method: 'GET',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
		});
	});

	it('Should throw when no URL is provided', () => {
		expect(() => convertCurlToJson('curl -X POST')).toThrow('no URL specified!');
	});

	it('Should handle --data with a single key=value pair', () => {
		const result = convertCurlToJson("curl --data 'key=value' http://localhost:2000");
		expect(result).toEqual({
			method: 'POST',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			data: { key: 'value' },
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
			},
		});
	});

	it('Should handle -d shorthand', () => {
		const result = convertCurlToJson("curl -d 'key=value' http://localhost:2000");
		expect(result).toEqual({
			method: 'POST',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			data: { key: 'value' },
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
			},
		});
	});

	it('Should handle --data with multiple key=value pairs', () => {
		const result = convertCurlToJson("curl --data 'a=1&b=2&c=3' http://localhost:2000");
		expect(result).toEqual({
			method: 'POST',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			data: { a: '1', b: '2', c: '3' },
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
			},
		});
	});

	it('Should handle multiple --data flags merged together', () => {
		const result = convertCurlToJson("curl -d 'a=1' -d 'b=2' http://localhost:2000");
		expect(result).toEqual({
			method: 'POST',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			data: { a: '1', b: '2' },
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
			},
		});
	});

	it('Should respect -X over --data when setting method', () => {
		const result = convertCurlToJson("curl -X PATCH -d 'key=value' http://localhost:2000");
		expect(result).toEqual({
			method: 'PATCH',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			data: { key: 'value' },
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
			},
		});
	});

	it('Should handle multiline curl with JSON body', () => {
		// eslint-disable-next-line n8n-local-rules/no-unneeded-backticks
		const curl = `curl --request POST \\\n  --url https://example.com/api \\\n  --header 'content-type: application/json; charset=UTF-8' \\\n  --data '{"userId":"123","active":false,"visited":false}'`;
		const result = convertCurlToJson(curl);
		expect(result).toEqual({
			method: 'POST',
			url: 'https://example.com/api',
			raw_url: 'https://example.com/api',
			headers: {
				'content-type': 'application/json; charset=UTF-8',
			},
			data: { userId: '123', active: false, visited: false },
		});
	});

	it('Should handle --data-raw', () => {
		const result = convertCurlToJson("curl --data-raw 'key=value' http://localhost:2000");
		expect(result).toEqual({
			method: 'POST',
			url: 'http://localhost:2000',
			raw_url: 'http://localhost:2000',
			data: { key: 'value' },
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
			},
		});
	});
});
