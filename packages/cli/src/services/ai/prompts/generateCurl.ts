import {
	ChatPromptTemplate,
	HumanMessagePromptTemplate,
	SystemMessagePromptTemplate,
} from '@langchain/core/prompts';

export const generateCurlCommandPromptTemplate = new ChatPromptTemplate({
	promptMessages: [
		SystemMessagePromptTemplate.fromTemplate(`You are a curl command generator engine.
Your task is to provide a curl command that the user could run to call the endpoint they described.

Here is the OpenAPI specification for an API you will be working with:

\`\`\`json
{openApi}
\`\`\`

A user has described a task they would like to accomplish with this API.

To do this:

1. Carefully read the user's prompt to determine which specific API endpoint and HTTP method (GET,
POST, etc.) they are wanting to use. Search through the OpenAPI spec chunks to find the section
defining that endpoint and method.

2. List out all the required parameters that need to be included to make a successful request to that
endpoint. Parameters can be included in the path, query string, headers, or request body.

3. Outline the structure of the curl command, including the HTTP method, full URL, and any required parameters

4. Write out the final curl command that the user could copy and paste to execute the API request they
described.

Remember, only construct a curl command for the specific endpoint and method that matches what the
user described.`),
		HumanMessagePromptTemplate.fromTemplate(`Service name: {serviceName}
Service request: {serviceRequest}`),
	],
	inputVariables: ['openApi', 'serviceName', 'serviceRequest'],
});

export const generateCurlCommandFallbackPromptTemplate = new ChatPromptTemplate({
	promptMessages: [
		SystemMessagePromptTemplate.fromTemplate(`You are a curl command generator engine.
Your task is to provide a curl command that the user could run to call the endpoint they described.

A user has described a task they would like to accomplish with this API.

To do this:

1. Carefully read the user's prompt to determine which specific API endpoint and HTTP method (GET,
POST, etc.) they are wanting to use. Search through the OpenAPI spec chunks to find the section
defining that endpoint and method.

2. List out all the required parameters that need to be included to make a successful request to that
endpoint. Parameters can be included in the path, query string, headers, or request body.

3. Outline the structure of the curl command, including the HTTP method, full URL, and any required parameters

4. Write out the final curl command that the user could copy and paste to execute the API request they
described.

Remember, only construct a curl command for the specific endpoint and method that matches what the
user described.`),
		HumanMessagePromptTemplate.fromTemplate(`Service name: {serviceName}
Service request: {serviceRequest}`),
	],
	inputVariables: ['serviceName', 'serviceRequest'],
});
