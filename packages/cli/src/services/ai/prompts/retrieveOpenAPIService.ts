import {
	ChatPromptTemplate,
	HumanMessagePromptTemplate,
	SystemMessagePromptTemplate,
} from '@langchain/core/prompts';

export const retrieveOpenAPIServicePromptTemplate = new ChatPromptTemplate({
	promptMessages: [
		SystemMessagePromptTemplate.fromTemplate(`Based on the list of available services in the format, please return a \`service\` name (and \`resource\`, if available) that is most relevant for the user provided prompt.

List Available Services in the following CSV Format: \`service\` | \`resource\` |\`title\` | \`description\`
\`\`\`csv
{services}
\`\`\`

IMPORTANT: Return the \`service\` name as found in the CSV. If none of the services match, always return the \`unknown\` service, NEVER make up a service that is not on this list.`),
		HumanMessagePromptTemplate.fromTemplate(`Service name: {serviceName}
Service request: {serviceRequest}`),
	],
	inputVariables: ['services', 'serviceName', 'serviceRequest'],
});
