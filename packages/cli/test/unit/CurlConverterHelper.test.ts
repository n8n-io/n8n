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
});

