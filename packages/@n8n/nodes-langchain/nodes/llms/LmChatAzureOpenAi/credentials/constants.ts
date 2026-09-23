/**
 * The Entra audience for Azure OpenAI, on both the classic and the Foundry route. Entra accepts
 * it with or without the trailing slash; the `resource` body parameter takes the slash form and
 * the OAuth2 scope takes the `/.default` suffix.
 */
export const AZURE_COGNITIVE_SERVICES_RESOURCE = 'https://cognitiveservices.azure.com/';

export const AZURE_COGNITIVE_SERVICES_SCOPE = `${AZURE_COGNITIVE_SERVICES_RESOURCE}.default`;
