import { toHttpNodeParameters, useImportCurlCommand } from '@/composables/useImportCurlCommand';

const showToast = vi.fn();

vi.mock('@/composables/useToast', () => ({
	useToast: () => ({ showToast }),
}));

describe('useImportCurlCommand', () => {
	describe('importCurlCommand', () => {
		test('Should parse cURL command with invalid protocol', () => {
			const curl = 'curl ftp://reqbin.com/echo -X POST';
			useImportCurlCommand().importCurlCommand(curl);
			expect(showToast).toHaveBeenCalledWith({
				duration: 0,
				message: 'The HTTP node doesn’t support FTP requests',
				title: 'Use the FTP node',
				type: 'error',
			});
		});
	});

	describe('toHttpNodeParameters', () => {
		test('Should parse form-urlencoded content type correctly', () => {
			const curl =
				'curl -X POST https://reqbin.com/echo/post/form -H "Content-Type: application/x-www-form-urlencoded" -d "param1=value1&param2=value2"';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo/post/form');
			expect(parameters.sendBody).toBe(true);
			expect(parameters.bodyParameters?.parameters[0].name).toBe('param1');
			expect(parameters.bodyParameters?.parameters[0].value).toBe('value1');
			expect(parameters.bodyParameters?.parameters[1].name).toBe('param2');
			expect(parameters.bodyParameters?.parameters[1].value).toBe('value2');
			expect(parameters.contentType).toBe('form-urlencoded');
			expect(parameters.sendHeaders).toBe(false);
			expect(parameters.sendQuery).toBe(false);
		});

		test('Should parse JSON content type correctly', () => {
			const curl =
				'curl -X POST https://reqbin.com/echo/post/json -H \'Content-Type: application/json\' -d \'{"login":"my_login","password":"my_password"}\'';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo/post/json');
			expect(parameters.sendBody).toBe(true);
			expect(parameters.bodyParameters?.parameters[0].name).toBe('login');
			expect(parameters.bodyParameters?.parameters[0].value).toBe('my_login');
			expect(parameters.bodyParameters?.parameters[1].name).toBe('password');
			expect(parameters.bodyParameters?.parameters[1].value).toBe('my_password');
			expect(parameters.contentType).toBe('json');
			expect(parameters.sendHeaders).toBe(false);
			expect(parameters.sendQuery).toBe(false);
		});

		test('Should parse multipart-form-data content type correctly', () => {
			const curl =
				'curl -X POST https://reqbin.com/echo/post/json -v -F key1=value1 -F upload=@localfilename';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo/post/json');
			expect(parameters.sendBody).toBe(true);
			expect(parameters.bodyParameters?.parameters[0].parameterType).toBe('formData');
			expect(parameters.bodyParameters?.parameters[0].name).toBe('key1');
			expect(parameters.bodyParameters?.parameters[0].value).toBe('value1');
			expect(parameters.bodyParameters?.parameters[1].parameterType).toBe('formBinaryData');
			expect(parameters.bodyParameters?.parameters[1].name).toBe('upload');
			expect(parameters.contentType).toBe('multipart-form-data');
			expect(parameters.sendHeaders).toBe(false);
			expect(parameters.sendQuery).toBe(false);
		});

		test('Should parse binary request correctly', () => {
			const curl =
				"curl --location --request POST 'https://www.website.com' --header 'Content-Type: image/png' --data-binary '@/Users/image.png'";
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://www.website.com');
			expect(parameters.method).toBe('POST');
			expect(parameters.sendBody).toBe(true);
			expect(parameters.contentType).toBe('binaryData');
			expect(parameters.sendHeaders).toBe(false);
			expect(parameters.sendQuery).toBe(false);
		});

		test('Should parse unknown content type correctly', () => {
			const curl =
				'curl -X POST https://reqbin.com/echo/post/xml -H "Content-Type: application/xml" -H "Accept: application/xml" -d "<Request><Login>my_login</Login><Password>my_password</Password></Request>"';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo/post/xml');
			expect(parameters.method).toBe('POST');
			expect(parameters.sendBody).toBe(true);
			expect(parameters.contentType).toBe('raw');
			expect(parameters.rawContentType).toBe('application/xml');
			expect(parameters.sendHeaders).toBe(true);
			expect(parameters.headerParameters?.parameters[0].name).toBe('Accept');
			expect(parameters.headerParameters?.parameters[0].value).toBe('application/xml');
			expect(parameters.sendQuery).toBe(false);
		});

		test('Should parse header properties and keep the original case', () => {
			const curl =
				'curl -X POST https://reqbin.com/echo/post/json -v -F key1=value1 -F upload=@localfilename -H "ACCEPT: text/javascript" -H "content-type: multipart/form-data"';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo/post/json');
			expect(parameters.sendBody).toBe(true);
			expect(parameters.bodyParameters?.parameters[0].parameterType).toBe('formData');
			expect(parameters.bodyParameters?.parameters[0].name).toBe('key1');
			expect(parameters.bodyParameters?.parameters[0].value).toBe('value1');
			expect(parameters.bodyParameters?.parameters[1].parameterType).toBe('formBinaryData');
			expect(parameters.bodyParameters?.parameters[1].name).toBe('upload');
			expect(parameters.contentType).toBe('multipart-form-data');
			expect(parameters.sendHeaders).toBe(true);
			expect(parameters.headerParameters?.parameters[0].name).toBe('ACCEPT');
			expect(parameters.headerParameters?.parameters[0].value).toBe('text/javascript');
			expect(parameters.sendQuery).toBe(false);
		});

		test('Should parse querystring properties', () => {
			const curl = "curl -G -d 'q=kitties' -d 'count=20' https://google.com/search";
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://google.com/search');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.contentType).toBeUndefined();
			expect(parameters.sendHeaders).toBe(false);
			expect(parameters.sendQuery).toBe(true);
			expect(parameters.queryParameters?.parameters[0].name).toBe('q');
			expect(parameters.queryParameters?.parameters[0].value).toBe('kitties');
			expect(parameters.queryParameters?.parameters[1].name).toBe('count');
			expect(parameters.queryParameters?.parameters[1].value).toBe('20');
		});

		test('Should parse basic authentication property and keep the original case', () => {
			const curl = 'curl https://reqbin.com/echo -u "login:password"';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.contentType).toBeUndefined();
			expect(parameters.sendQuery).toBe(false);
			expect(parameters.sendHeaders).toBe(true);
			expect(parameters.headerParameters?.parameters[0].name).toBe('authorization');
			expect(parameters.headerParameters?.parameters[0].value).toBe(
				`Basic ${Buffer.from('login:password').toString('base64')}`,
			);
		});

		test('Should parse location flag with --location', () => {
			const curl = 'curl https://reqbin.com/echo -u "login:password" --location';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.contentType).toBeUndefined();
			expect(parameters.sendQuery).toBe(false);
			expect(parameters.sendHeaders).toBe(true);
			expect(parameters.headerParameters?.parameters[0].name).toBe('authorization');
			expect(parameters.headerParameters?.parameters[0].value).toBe(
				`Basic ${Buffer.from('login:password').toString('base64')}`,
			);
			expect(parameters.options.redirect.redirect.followRedirects).toBe(true);
		});

		test('Should parse location flag with --L', () => {
			const curl = 'curl https://reqbin.com/echo -u "login:password" -L';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.contentType).toBeUndefined();
			expect(parameters.sendQuery).toBe(false);
			expect(parameters.sendHeaders).toBe(true);
			expect(parameters.headerParameters?.parameters[0].name).toBe('authorization');
			expect(parameters.headerParameters?.parameters[0].value).toBe(
				`Basic ${Buffer.from('login:password').toString('base64')}`,
			);
			expect(parameters.options.redirect.redirect.followRedirects).toBe(true);
		});

		test('Should parse location and max redirects flags with --location and --max-redirs 10', () => {
			const curl = 'curl https://reqbin.com/echo -u "login:password" --location --max-redirs 10';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.contentType).toBeUndefined();
			expect(parameters.sendQuery).toBe(false);
			expect(parameters.sendHeaders).toBe(true);
			expect(parameters.headerParameters?.parameters[0].name).toBe('authorization');
			expect(parameters.headerParameters?.parameters[0].value).toBe(
				`Basic ${Buffer.from('login:password').toString('base64')}`,
			);
			expect(parameters.options.redirect.redirect.followRedirects).toBe(true);
			expect(parameters.options.redirect.redirect.maxRedirects).toBe(10);
		});

		test('Should parse proxy flag -x', () => {
			const curl = 'curl https://reqbin.com/echo -u "login:password" -x https://google.com';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.contentType).toBeUndefined();
			expect(parameters.sendQuery).toBe(false);
			expect(parameters.sendHeaders).toBe(true);
			expect(parameters.headerParameters?.parameters[0].name).toBe('authorization');
			expect(parameters.headerParameters?.parameters[0].value).toBe(
				`Basic ${Buffer.from('login:password').toString('base64')}`,
			);
			expect(parameters.options.proxy).toBe('https://google.com');
		});

		test('Should parse proxy flag --proxy', () => {
			const curl = 'curl https://reqbin.com/echo -u "login:password" -x https://google.com';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.contentType).toBeUndefined();
			expect(parameters.sendQuery).toBe(false);
			expect(parameters.sendHeaders).toBe(true);
			expect(parameters.headerParameters?.parameters[0].name).toBe('authorization');
			expect(parameters.headerParameters?.parameters[0].value).toBe(
				`Basic ${Buffer.from('login:password').toString('base64')}`,
			);
			expect(parameters.options.proxy).toBe('https://google.com');
		});

		test('Should parse include headers on output flag --include', () => {
			const curl =
				'curl https://reqbin.com/echo -u "login:password" --include -x https://google.com';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.contentType).toBeUndefined();
			expect(parameters.sendQuery).toBe(false);
			expect(parameters.sendHeaders).toBe(true);
			expect(parameters.headerParameters?.parameters[0].name).toBe('authorization');
			expect(parameters.headerParameters?.parameters[0].value).toBe(
				`Basic ${Buffer.from('login:password').toString('base64')}`,
			);
			expect(parameters.options.response.response.fullResponse).toBe(true);
		});

		test('Should parse include headers on output flag -i', () => {
			const curl = 'curl https://reqbin.com/echo -u "login:password" -x https://google.com -i';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.contentType).toBeUndefined();
			expect(parameters.sendQuery).toBe(false);
			expect(parameters.sendHeaders).toBe(true);
			expect(parameters.headerParameters?.parameters[0].name).toBe('authorization');
			expect(parameters.headerParameters?.parameters[0].value).toBe(
				`Basic ${Buffer.from('login:password').toString('base64')}`,
			);
			expect(parameters.options.response.response.fullResponse).toBe(true);
		});

		test('Should parse include request flag -X', () => {
			const curl = 'curl -X POST https://reqbin.com/echo -u "login:password" -x https://google.com';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.method).toBe('POST');
			expect(parameters.sendBody).toBe(false);
		});

		test('Should parse include request flag --request', () => {
			const curl =
				'curl --request POST https://reqbin.com/echo -u "login:password" -x https://google.com';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.method).toBe('POST');
			expect(parameters.sendBody).toBe(false);
		});

		test('Should parse include timeout flag --connect-timeout', () => {
			const curl =
				'curl --request POST https://reqbin.com/echo -u "login:password" --connect-timeout 20';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.method).toBe('POST');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.options.timeout).toBe(20000);
		});

		test('Should parse download file flag --output', () => {
			const curl = 'curl --request POST https://reqbin.com/echo -u "login:password" --output data';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.method).toBe('POST');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.options.response.response.responseFormat).toBe('file');
			expect(parameters.options.response.response.outputPropertyName).toBe('data');
		});

		test('Should parse download file flag -o', () => {
			const curl = 'curl --request POST https://reqbin.com/echo -u "login:password" -o data';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.method).toBe('POST');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.options.response.response.responseFormat).toBe('file');
			expect(parameters.options.response.response.outputPropertyName).toBe('data');
		});

		test('Should parse ignore SSL flag -k', () => {
			const curl = 'curl --request POST https://reqbin.com/echo -u "login:password" -k';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.method).toBe('POST');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.options.allowUnauthorizedCerts).toBe(true);
		});

		test('Should parse ignore SSL flag --insecure', () => {
			const curl = 'curl --request POST https://reqbin.com/echo -u "login:password" --insecure';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.method).toBe('POST');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.options.allowUnauthorizedCerts).toBe(true);
		});

		test('Should parse form url encoded body data if parameter has base64 special characters like / or % or =', () => {
			const curl =
				'curl -X POST https://reqbin.com/echo \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "redirect_uri=https://test.app.n8n.cloud/webhook-test/12345" \
  -d "client_secret=secret%3D%3D"';

			const parameters = toHttpNodeParameters(curl);

			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.method).toBe('POST');
			expect(parameters.sendBody).toBe(true);
			expect(parameters.contentType).toEqual('form-urlencoded');
			expect(parameters.bodyParameters).toEqual({
				parameters: [
					{
						name: 'redirect_uri',
						value: 'https://test.app.n8n.cloud/webhook-test/12345',
					},
					{
						name: 'client_secret',
						value: 'secret==',
					},
				],
			});
		});

		test('Should parse cURL command with no headers, body, or query parameters', () => {
			const curl = 'curl https://reqbin.com/echo';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.method).toBe('GET');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.contentType).toBeUndefined();
			expect(parameters.sendHeaders).toBe(false);
			expect(parameters.sendQuery).toBe(false);
		});

		test('Should parse cURL command with custom HTTP method', () => {
			const curl = 'curl -X DELETE https://reqbin.com/echo';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.method).toBe('DELETE');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.contentType).toBeUndefined();
			expect(parameters.sendHeaders).toBe(false);
			expect(parameters.sendQuery).toBe(false);
		});

		test('Should parse cURL command with multiple headers', () => {
			const curl =
				'curl https://reqbin.com/echo -H "Authorization: Bearer token" -H "Accept: application/json"';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.contentType).toBeUndefined();
			expect(parameters.sendHeaders).toBe(true);
			expect(parameters.headerParameters?.parameters[0].name).toBe('Authorization');
			expect(parameters.headerParameters?.parameters[0].value).toBe('Bearer token');
			expect(parameters.headerParameters?.parameters[1].name).toBe('Accept');
			expect(parameters.headerParameters?.parameters[1].value).toBe('application/json');
		});

		test('Should parse cURL command with query parameters in URL', () => {
			const curl = 'curl https://reqbin.com/echo\\?param1\\=value1\\&param2\\=value2';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.contentType).toBeUndefined();
			expect(parameters.sendHeaders).toBe(false);
			expect(parameters.sendQuery).toBe(true);
			expect(parameters.queryParameters).toEqual({
				parameters: [
					{
						name: 'param1',
						value: 'value1',
					},
					{
						name: 'param2',
						value: 'value2',
					},
				],
			});
		});

		test('Should parse cURL command with both query parameters and -d flag', () => {
			const curl =
				'curl -G https://reqbin.com/echo\\?param1\\=value1 -d "param2=value2" -d "param3=value3"';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.contentType).toBeUndefined();
			expect(parameters.sendHeaders).toBe(false);
			expect(parameters.sendQuery).toBe(true);
			expect(parameters.queryParameters?.parameters[0].name).toBe('param1');
			expect(parameters.queryParameters?.parameters[0].value).toBe('value1');
			expect(parameters.queryParameters?.parameters[1].name).toBe('param2');
			expect(parameters.queryParameters?.parameters[1].value).toBe('value2');
			expect(parameters.queryParameters?.parameters[2].name).toBe('param3');
			expect(parameters.queryParameters?.parameters[2].value).toBe('value3');
		});

		test('Should parse cURL command with data, defaulting to form urlencoded content type', () => {
			const curl = 'curl -X POST https://reqbin.com/echo -d "key=value"';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.method).toBe('POST');
			expect(parameters.sendBody).toBe(true);
			expect(parameters.contentType).toEqual('form-urlencoded');
			expect(parameters.bodyParameters?.parameters[0].name).toBe('key');
			expect(parameters.bodyParameters?.parameters[0].value).toBe('value');
		});

		test('Should parse cURL command with file upload and no content type', () => {
			const curl = 'curl -X POST https://reqbin.com/echo -F "file=@/path/to/file"';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.method).toBe('POST');
			expect(parameters.sendBody).toBe(true);
			expect(parameters.contentType).toBe('multipart-form-data');
			expect(parameters.bodyParameters?.parameters[0].parameterType).toBe('formBinaryData');
			expect(parameters.bodyParameters?.parameters[0].name).toBe('file');
		});

		test('Should parse cURL command with empty data flag', () => {
			const curl = 'curl -X POST https://reqbin.com/echo -d ""';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.method).toBe('POST');
			expect(parameters.sendBody).toBe(true);
			expect(parameters.contentType).toEqual('form-urlencoded');
			expect(parameters.bodyParameters?.parameters).toEqual([]);
		});

		test('Should parse cURL command with custom header and case-insensitive content-type', () => {
			const curl =
				'curl -X POST https://reqbin.com/echo -H "content-TYPE: application/json" -d \'{"key":"value"}\'';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.method).toBe('POST');
			expect(parameters.sendBody).toBe(true);
			expect(parameters.contentType).toBe('json');
			expect(parameters.bodyParameters?.parameters[0].name).toBe('key');
			expect(parameters.bodyParameters?.parameters[0].value).toBe('value');
		});

		test('Should parse cURL command with multiple query parameters in URL', () => {
			const curl =
				'curl https://reqbin.com/echo\\?param1\\=value1\\&param2\\=value2\\&param3\\=value3';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.contentType).toBeUndefined();
			expect(parameters.sendHeaders).toBe(false);
			expect(parameters.sendQuery).toBe(true);
			expect(parameters.queryParameters?.parameters).toEqual([
				{ name: 'param1', value: 'value1' },
				{ name: 'param2', value: 'value2' },
				{ name: 'param3', value: 'value3' },
			]);
		});

		test('Should parse cURL command with custom header and no content type', () => {
			const curl = 'curl -X GET https://reqbin.com/echo -H "Authorization: Bearer token"';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.method).toBe('GET');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.contentType).toBeUndefined();
			expect(parameters.sendHeaders).toBe(true);
			expect(parameters.headerParameters?.parameters[0].name).toBe('Authorization');
			expect(parameters.headerParameters?.parameters[0].value).toBe('Bearer token');
		});

		test('Should parse cURL command with empty query parameters', () => {
			const curl = 'curl https://reqbin.com/echo\\?param1\\=\\&param2=';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.contentType).toBeUndefined();
			expect(parameters.sendHeaders).toBe(false);
			expect(parameters.sendQuery).toBe(true);
			expect(parameters.queryParameters?.parameters).toEqual([
				{ name: 'param1', value: '' },
				{ name: 'param2', value: '' },
			]);
		});

		test('Should parse cURL command with custom HTTP method and no body', () => {
			const curl = 'curl -X PUT https://reqbin.com/echo';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.method).toBe('PUT');
			expect(parameters.sendBody).toBe(false);
			expect(parameters.contentType).toBeUndefined();
			expect(parameters.sendHeaders).toBe(false);
			expect(parameters.sendQuery).toBe(false);
		});

		test('Should parse cURL command with custom header and multiple data fields', () => {
			const curl =
				'curl -X POST https://reqbin.com/echo -H "Authorization: Bearer token" -d "key1=value1" -d "key2=value2"';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.method).toBe('POST');
			expect(parameters.sendBody).toBe(true);
			expect(parameters.contentType).toEqual('form-urlencoded');
			expect(parameters.bodyParameters?.parameters).toEqual([
				{ name: 'key1', value: 'value1' },
				{ name: 'key2', value: 'value2' },
			]);
			expect(parameters.sendHeaders).toBe(true);
			expect(parameters.headerParameters?.parameters[0].name).toBe('Authorization');
			expect(parameters.headerParameters?.parameters[0].value).toBe('Bearer token');
		});

		test('Should parse cURL command with custom header and binary data', () => {
			const curl =
				'curl -X POST https://reqbin.com/echo -H "Content-Type: application/octet-stream" --data-binary "@/path/to/file"';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.method).toBe('POST');
			expect(parameters.sendBody).toBe(true);
			expect(parameters.contentType).toBe('raw');
			expect(parameters.rawContentType).toBe('application/octet-stream');
			expect(parameters.sendHeaders).toBe(false);
			expect(parameters.sendQuery).toBe(false);
		});

		test('Should parse cURL command with multiple headers and case-insensitive keys', () => {
			const curl =
				'curl -X POST https://reqbin.com/echo -H "content-type: application/json" -H "ACCEPT: application/json" -d \'{"key":"value"}\'';
			const parameters = toHttpNodeParameters(curl);
			expect(parameters.url).toBe('https://reqbin.com/echo');
			expect(parameters.method).toBe('POST');
			expect(parameters.sendBody).toBe(true);
			expect(parameters.contentType).toBe('json');
			expect(parameters.bodyParameters?.parameters[0].name).toBe('key');
			expect(parameters.bodyParameters?.parameters[0].value).toBe('value');
			expect(parameters.sendHeaders).toBe(true);
			expect(parameters.headerParameters?.parameters[0].name).toBe('ACCEPT');
			expect(parameters.headerParameters?.parameters[0].value).toBe('application/json');
		});

		test('Should parse cURL command with no URL', () => {
			const curl = 'curl -X POST -d "key=value"';
			expect(() => toHttpNodeParameters(curl)).toThrow('no URL specified!');
		});
	});
});
