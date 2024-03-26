import {
	ChatPromptTemplate,
	HumanMessagePromptTemplate,
	SystemMessagePromptTemplate,
} from '@langchain/core/prompts';

export const retrieveServicePromptTemplate = new ChatPromptTemplate({
	promptMessages: [
		SystemMessagePromptTemplate.fromTemplate(`Based on the list of available service APIs in the CSV, please return the \`id\` of the CSV entry that is most relevant for the user provided request.

List Available service APIs in the following CSV Format: \`id\` | \`title\` | \`description\`
\`\`\`csv
{services}
\`\`\`

IMPORTANT: Return the \`id\` of the service exactly as found in the CSV. If none of the services match perfectly, always return the \`id\` as empty string, NEVER hallucinate a service that is not on this list.`),
		HumanMessagePromptTemplate.fromTemplate(`Service API name: {serviceName}
Service API Request: {serviceRequest}`),
	],
	inputVariables: ['services', 'serviceName', 'serviceRequest'],
});
