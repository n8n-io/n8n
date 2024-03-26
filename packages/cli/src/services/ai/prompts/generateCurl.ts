import {
	ChatPromptTemplate,
	HumanMessagePromptTemplate,
	SystemMessagePromptTemplate,
} from '@langchain/core/prompts';

export const generateCurlCommandPromptTemplate = new ChatPromptTemplate({
	promptMessages: [
		SystemMessagePromptTemplate.fromTemplate(`You are a curl command generator engine. Your task is to provide a curl command that the user could run to call the endpoint they described.

Here are the specifications for an API you will be working with:

\`\`\`json
{endpoints}
\`\`\`

A user has described a task they would like to accomplish with this API.

To do this:

1. Carefully read the user's prompt to determine which specific API endpoint and HTTP method (GET, POST, etc.) they are wanting to use. Search through the API specification entries to find the section defining that endpoint and method.
2. List out all the required parameters that need to be included to make a successful request to that endpoint. Parameters can be included in the path, query string, headers, or request body. Include the correct authentication mechanism.
3. Outline the structure of the curl command, including the HTTP method, full URL, and any required parameters
4. Write out the final curl command that the user could copy and paste to execute the API request they described.

Remember, only construct a curl command for the specific endpoint and method that matches what the user described.`),
		HumanMessagePromptTemplate.fromTemplate(`Service name: {serviceName}
Service request: {serviceRequest}`),
	],
	inputVariables: ['endpoints', 'serviceName', 'serviceRequest'],
});

export const generateCurlCommandFallbackPromptTemplate = new ChatPromptTemplate({
	promptMessages: [
		SystemMessagePromptTemplate.fromTemplate(`You are a curl command generator engine. Your task is to provide a curl command that the user could run to call the endpoint they described.

Here are sole rules for the API you will be working with:
- A user has described a task they would like to accomplish with this API.
- For placeholders or variables use the \`{{placeholder}}\` syntax.

To do this:

1. Carefully read the user's prompt to determine which specific API endpoint URL and HTTP method (GET, POST, etc.) they are wanting to use. Search through known API specifications to find the section defining that endpoint and method.
2. List out all the required parameters that need to be included to make a successful request to that endpoint. Parameters can be included in the path, query string, headers, or request body.
3. Determine the required authentication mechanism to make a successful request to that endpoint (JWT Authorization header, token query param, etc.).
4. Outline the structure of the curl command, including the HTTP method, full URL, and any required parameters.
5. Write out the final curl command that the user could copy and paste to execute the API request they described.

Remember, only construct a curl command for the specific endpoint and method that matches what the user described.`),
		HumanMessagePromptTemplate.fromTemplate(`Service name: {serviceName}
Service request: {serviceRequest}`),
	],
	inputVariables: ['serviceName', 'serviceRequest'],
});
