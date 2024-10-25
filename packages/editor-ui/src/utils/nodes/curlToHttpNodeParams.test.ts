import { flattenObject, toHttpNodeParameters } from '@/utils/nodes/curlToHttpNodeParams';

describe('curlToHttpNodeParams', () => {
	it('should convert cURL command to object and return as http node params', () => {
		const curlCommand = 'curl -v -X GET https://test.n8n.berlin/users';
		const curlObject = toHttpNodeParameters(curlCommand);

		expect(curlObject).toEqual({
			url: 'https://test.n8n.berlin/users',
			authentication: 'none',
			method: 'GET',
			sendHeaders: false,
			sendQuery: false,
			options: {},
			sendBody: false,
		});

		expect(flattenObject(curlObject, 'parameters')).toEqual({
			'parameters.method': 'GET',
			'parameters.url': 'https://test.n8n.berlin/users',
			'parameters.authentication': 'none',
			'parameters.sendBody': false,
			'parameters.sendHeaders': false,
			'parameters.sendQuery': false,
		});
	});
});
