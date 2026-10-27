import { RuleTester } from '@typescript-eslint/rule-tester';

import { RequireNodeApiErrorRule } from './require-node-api-error.js';

const ruleTester = new RuleTester();

ruleTester.run('require-node-api-error', RequireNodeApiErrorRule, {
	valid: [
		{
			name: 'throw NodeApiError in catch block',
			code: `
try {
	await apiRequest();
} catch (error) {
	throw new NodeApiError(this.getNode(), error as JsonObject);
}`,
		},
		{
			name: 'throw NodeOperationError in catch block',
			code: `
try {
	await apiRequest();
} catch (error) {
	throw new NodeOperationError(this.getNode(), 'Operation failed', { itemIndex: i });
}`,
		},
		{
			name: 'throw outside catch block (not in scope)',
			code: `
function validate(input: string) {
	if (!input) {
		throw new Error('Input required');
	}
}`,
		},
		{
			name: 'throw new Error outside catch block (not in scope)',
			code: `
throw new Error('Something went wrong');`,
		},
		{
			name: 'continueOnFail pattern with NodeApiError',
			code: `
try {
	responseData = await apiRequest.call(this, 'POST', '/tasks', body);
} catch (error) {
	if (this.continueOnFail()) {
		returnData.push({ json: { error: error.message } });
		continue;
	}
	throw new NodeApiError(this.getNode(), error as JsonObject);
}`,
		},
		{
			name: 'conditional handling then NodeApiError in else',
			code: `
try {
	await ftp.put(data, path);
} catch (error) {
	if (error.code === 553) {
		await ftp.mkdir(dirPath, true);
		await ftp.put(data, path);
	} else {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}`,
		},
		{
			name: 'throw wrapped error stored in variable',
			code: `
try {
	await apiRequest();
} catch (error) {
	const wrapped = new NodeApiError(this.getNode(), error as JsonObject);
	throw wrapped;
}`,
		},
		{
			name: 'shadowed variable with same name as catch param',
			code: `
try {
	await apiRequest();
} catch (error) {
	const fn = (error: Error) => {
		throw error;
	};
}`,
		},
		{
			name: 'no throw in catch block',
			code: `
try {
	await apiRequest();
} catch (error) {
	console.error(error);
}`,
		},
		{
			name: 'bare re-throw in credential file (skipped)',
			filename: '/path/to/MyCredential.credentials.ts',
			code: `
try {
	await apiRequest();
} catch (error) {
	throw error;
}`,
		},
		{
			name: 'bare re-throw in .js file (skipped)',
			filename: '/path/to/helper.js',
			code: `
try {
	apiRequest();
} catch (error) {
	throw error;
}`,
		},
	],
	invalid: [
		{
			name: 'bare re-throw of caught error',
			code: `
try {
	await apiRequest();
} catch (error) {
	throw error;
}`,
			errors: [{ messageId: 'useNodeApiError' }],
		},
		{
			name: 'throw new Error in catch block',
			code: `
try {
	await apiRequest();
} catch (error) {
	throw new Error('Request failed');
}`,
			errors: [
				{
					messageId: 'useNodeApiErrorInsteadOfGeneric',
					data: { errorClass: 'Error' },
				},
			],
		},
		{
			name: 'bare re-throw after continueOnFail',
			code: `
try {
	responseData = await apiRequest.call(this, 'POST', '/tasks', body);
} catch (error) {
	if (this.continueOnFail()) {
		returnData.push({ json: { error: error.message } });
		continue;
	}
	throw error;
}`,
			errors: [{ messageId: 'useNodeApiError' }],
		},
		{
			name: 'throw new TypeError in catch block',
			code: `
try {
	JSON.parse(data);
} catch (error) {
	throw new TypeError('Invalid JSON');
}`,
			errors: [
				{
					messageId: 'useNodeApiErrorInsteadOfGeneric',
					data: { errorClass: 'TypeError' },
				},
			],
		},
		{
			name: 'bare re-throw in nested catch',
			code: `
try {
	try {
		await apiRequest();
	} catch (innerError) {
		throw innerError;
	}
} catch (outerError) {
	throw new NodeApiError(this.getNode(), outerError as JsonObject);
}`,
			errors: [{ messageId: 'useNodeApiError' }],
		},
		{
			name: 'throw named variable in catch',
			code: `
try {
	await apiRequest();
} catch (e) {
	throw e;
}`,
			errors: [{ messageId: 'useNodeApiError' }],
		},
	],
});
