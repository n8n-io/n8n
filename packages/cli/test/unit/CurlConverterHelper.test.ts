import { toHttpNodeParameters } from "../../src/CurlConverterHelper";

describe('CurlConverterHelper', () => {

	test('Should parse form-urlencoded content type correctly', () => {
		const curl = 'curl -X POST https://reqbin.com/echo/post/form -H "Content-Type: application/x-www-form-urlencoded" -d "param1=value1&param2=value2"';
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
		const curl = `curl -X POST https://reqbin.com/echo/post/json -H 'Content-Type: application/json' -d '{"login":"my_login","password":"my_password"}'`;
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
		const curl = `curl -X POST https://reqbin.com/echo/post/json -v -F key1=value1 -F upload=@localfilename`;
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
		const curl = `curl --location --request POST 'https://www.website.com' --header 'Content-Type: image/png' --data-binary '@/Users/image.png`;
		const parameters = toHttpNodeParameters(curl);
		console.log(JSON.stringify(parameters, undefined, 2));
		expect(parameters.url).toBe('https://www.website.com');
		expect(parameters.method).toBe('POST');
		expect(parameters.sendBody).toBe(true);
		expect(parameters.contentType).toBe('binaryData');
		expect(parameters.sendHeaders).toBe(false);
		expect(parameters.sendQuery).toBe(false);
	});

	test('Should parse unknown content type correctly', () => {
		const curl = `curl -X POST https://reqbin.com/echo/post/xml
		-H "Content-Type: application/xml"
		-H "Accept: application/xml"
		-d "<Request><Login>my_login</Login><Password>my_password</Password></Request>"`;
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
		const curl = `curl -X POST https://reqbin.com/echo/post/json -v -F key1=value1 -F upload=@localfilename -H "ACCEPT: text/javascript" -H "content-type: multipart/form-data"`;
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
		const curl = `curl -G -d 'q=kitties' -d 'count=20' https://google.com/search`;
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
		const curl = `curl https://reqbin.com/echo -u "login:password"`;
		const parameters = toHttpNodeParameters(curl);
		expect(parameters.url).toBe('https://reqbin.com/echo');
		expect(parameters.sendBody).toBe(false);
		expect(parameters.contentType).toBeUndefined();
		expect(parameters.sendQuery).toBe(false);
		expect(parameters.sendHeaders).toBe(true);
		expect(parameters.headerParameters?.parameters[0].name).toBe('authorization');
		expect(parameters.headerParameters?.parameters[0].value).toBe(`Basic ${Buffer.from('login:password').toString('base64')}`);
	});

	test('Should parse location flag with --location', () => {
		const curl = `curl https://reqbin.com/echo -u "login:password" --location`;
		const parameters = toHttpNodeParameters(curl);
		expect(parameters.url).toBe('https://reqbin.com/echo');
		expect(parameters.sendBody).toBe(false);
		expect(parameters.contentType).toBeUndefined();
		expect(parameters.sendQuery).toBe(false);
		expect(parameters.sendHeaders).toBe(true);
		expect(parameters.headerParameters?.parameters[0].name).toBe('authorization');
		expect(parameters.headerParameters?.parameters[0].value).toBe(`Basic ${Buffer.from('login:password').toString('base64')}`);
		expect(parameters.options.redirect.redirect.followRedirects).toBe(true);
	});

	test('Should parse location flag with --L', () => {
		const curl = `curl https://reqbin.com/echo -u "login:password" -L`;
		const parameters = toHttpNodeParameters(curl);
		expect(parameters.url).toBe('https://reqbin.com/echo');
		expect(parameters.sendBody).toBe(false);
		expect(parameters.contentType).toBeUndefined();
		expect(parameters.sendQuery).toBe(false);
		expect(parameters.sendHeaders).toBe(true);
		expect(parameters.headerParameters?.parameters[0].name).toBe('authorization');
		expect(parameters.headerParameters?.parameters[0].value).toBe(`Basic ${Buffer.from('login:password').toString('base64')}`);
		expect(parameters.options.redirect.redirect.followRedirects).toBe(true);
	});

	test('Should parse location and max redirects flags with --location and --max-redirs 10', () => {
		const curl = `curl https://reqbin.com/echo -u "login:password" --location --max-redirs 10`;
		const parameters = toHttpNodeParameters(curl);
		expect(parameters.url).toBe('https://reqbin.com/echo');
		expect(parameters.sendBody).toBe(false);
		expect(parameters.contentType).toBeUndefined();
		expect(parameters.sendQuery).toBe(false);
		expect(parameters.sendHeaders).toBe(true);
		expect(parameters.headerParameters?.parameters[0].name).toBe('authorization');
		expect(parameters.headerParameters?.parameters[0].value).toBe(`Basic ${Buffer.from('login:password').toString('base64')}`);
		expect(parameters.options.redirect.redirect.followRedirects).toBe(true);
		expect(parameters.options.redirect.redirect.maxRedirects).toBe("10");
	});

	test('Should parse proxy flag -x', () => {
		const curl = `curl https://reqbin.com/echo -u "login:password" -x https://google.com`;
		const parameters = toHttpNodeParameters(curl);
		expect(parameters.url).toBe('https://reqbin.com/echo');
		expect(parameters.sendBody).toBe(false);
		expect(parameters.contentType).toBeUndefined();
		expect(parameters.sendQuery).toBe(false);
		expect(parameters.sendHeaders).toBe(true);
		expect(parameters.headerParameters?.parameters[0].name).toBe('authorization');
		expect(parameters.headerParameters?.parameters[0].value).toBe(`Basic ${Buffer.from('login:password').toString('base64')}`);
		expect(parameters.options.proxy).toBe('https://google.com');
	});

	test('Should parse proxy flag --proxy', () => {
		const curl = `curl https://reqbin.com/echo -u "login:password" -x https://google.com`;
		const parameters = toHttpNodeParameters(curl);
		expect(parameters.url).toBe('https://reqbin.com/echo');
		expect(parameters.sendBody).toBe(false);
		expect(parameters.contentType).toBeUndefined();
		expect(parameters.sendQuery).toBe(false);
		expect(parameters.sendHeaders).toBe(true);
		expect(parameters.headerParameters?.parameters[0].name).toBe('authorization');
		expect(parameters.headerParameters?.parameters[0].value).toBe(`Basic ${Buffer.from('login:password').toString('base64')}`);
		expect(parameters.options.proxy).toBe('https://google.com');
	});

	test('Should parse include headers on output flag --include', () => {
		const curl = `curl https://reqbin.com/echo -u "login:password" --include -x https://google.com`;
		const parameters = toHttpNodeParameters(curl);
		expect(parameters.url).toBe('https://reqbin.com/echo');
		expect(parameters.sendBody).toBe(false);
		expect(parameters.contentType).toBeUndefined();
		expect(parameters.sendQuery).toBe(false);
		expect(parameters.sendHeaders).toBe(true);
		expect(parameters.headerParameters?.parameters[0].name).toBe('authorization');
		expect(parameters.headerParameters?.parameters[0].value).toBe(`Basic ${Buffer.from('login:password').toString('base64')}`);
		expect(parameters.options.response.response.fullResponse).toBe(true);
	});

	test('Should parse include headers on output flag -i', () => {
		const curl = `curl https://reqbin.com/echo -u "login:password" -x https://google.com -i`;
		const parameters = toHttpNodeParameters(curl);
		expect(parameters.url).toBe('https://reqbin.com/echo');
		expect(parameters.sendBody).toBe(false);
		expect(parameters.contentType).toBeUndefined();
		expect(parameters.sendQuery).toBe(false);
		expect(parameters.sendHeaders).toBe(true);
		expect(parameters.headerParameters?.parameters[0].name).toBe('authorization');
		expect(parameters.headerParameters?.parameters[0].value).toBe(`Basic ${Buffer.from('login:password').toString('base64')}`);
		expect(parameters.options.response.response.fullResponse).toBe(true);
	});

	test('Should parse include request flag -X', () => {
		const curl = `curl -X POST https://reqbin.com/echo -u "login:password" -x https://google.com`;
		const parameters = toHttpNodeParameters(curl);
		expect(parameters.url).toBe('https://reqbin.com/echo');
		expect(parameters.method).toBe('POST');
		expect(parameters.sendBody).toBe(false);
	});

	test('Should parse include request flag --request', () => {
		const curl = `curl --request POST https://reqbin.com/echo -u "login:password" -x https://google.com`;
		const parameters = toHttpNodeParameters(curl);
		expect(parameters.url).toBe('https://reqbin.com/echo');
		expect(parameters.method).toBe('POST');
		expect(parameters.sendBody).toBe(false);
	});

	test('Should parse include timeout flag --connect-timeout', () => {
		const curl = `curl --request POST https://reqbin.com/echo -u "login:password" --connect-timeout 20`;
		const parameters = toHttpNodeParameters(curl);
		expect(parameters.url).toBe('https://reqbin.com/echo');
		expect(parameters.method).toBe('POST');
		expect(parameters.sendBody).toBe(false);
		expect(parameters.options.timeout).toBe(20000);
	});

	test('Should parse download file flag -O', () => {
		const curl = `curl --request POST https://reqbin.com/echo -u "login:password" -O`;
;		const parameters = toHttpNodeParameters(curl);
		expect(parameters.url).toBe('https://reqbin.com/echo');
		expect(parameters.method).toBe('POST');
		expect(parameters.sendBody).toBe(false);
		expect(parameters.options.response.response.responseFormat).toBe('file');
		expect(parameters.options.response.response.outputPropertyName).toBe('data');
	})

	test('Should parse download file flag -o', () => {
		const curl = `curl --request POST https://reqbin.com/echo -u "login:password" -o`;
		const parameters = toHttpNodeParameters(curl);
		expect(parameters.url).toBe('https://reqbin.com/echo');
		expect(parameters.method).toBe('POST');
		expect(parameters.sendBody).toBe(false);
		expect(parameters.options.response.response.responseFormat).toBe('file');
		expect(parameters.options.response.response.outputPropertyName).toBe('data');
	})

	test('Should parse ignore SSL flag -k', () => {
		const curl = `curl --request POST https://reqbin.com/echo -u "login:password" -k`;
		const parameters = toHttpNodeParameters(curl);
		expect(parameters.url).toBe('https://reqbin.com/echo');
		expect(parameters.method).toBe('POST');
		expect(parameters.sendBody).toBe(false);
		expect(parameters.options.allowUnauthorizedCerts).toBe(true);
	})

	test('Should parse ignore SSL flag --insecure', () => {
		const curl = `curl --request POST https://reqbin.com/echo -u "login:password" --insecure`;
		const parameters = toHttpNodeParameters(curl);
		expect(parameters.url).toBe('https://reqbin.com/echo');
		expect(parameters.method).toBe('POST');
		expect(parameters.sendBody).toBe(false);
		expect(parameters.options.allowUnauthorizedCerts).toBe(true);
	})
});

