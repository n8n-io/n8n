import { getAgentDetails } from '../actions/agent/agent.utils';
import { BASE_URL_V2 } from '../constants';
import { apiRequest } from '../transport';
const VALID_FIELD_TYPES = [
    'boolean',
    'number',
    'string',
    'dateTime',
    'time',
    'array',
    'object',
    'options',
];
function isValidFieldType(value) {
    return VALID_FIELD_TYPES.includes(value);
}
/**
 * Searches for Airtop agents available in the user's account.
 * Used as the searchListMethod for the agent resourceLocator.
 */
export async function listSearchAgents(filter) {
    const qs = {
        limit: 50,
        enabled: true,
        published: true,
        createdByMe: true,
        name: filter ?? '',
    };
    const response = await apiRequest.call(this, 'GET', `${BASE_URL_V2}/agents`, {}, qs);
    const agents = response.agents ?? [];
    const results = agents
        .map((agent) => ({
        name: agent.name,
        value: agent.id,
    }))
        .sort((a, b) => a.name.localeCompare(b.name));
    return { results };
}
/**
 * Maps the agent parameters to the resource mapper fields.
 * Used as the resourceMapperMethod for the agent parameters dropdown.
 */
export async function agentsResourceMapping() {
    const agentId = this.getCurrentNodeParameter('agentId');
    if (!agentId?.value) {
        return { fields: [] };
    }
    const response = await getAgentDetails.call(this, agentId.value);
    if (!response?.versionData?.configVarsSchema?.properties) {
        return { fields: [] };
    }
    const properties = response.versionData.configVarsSchema.properties;
    const requiredFields = response.versionData.configVarsSchema?.required ?? [];
    const fields = Object.entries(properties)
        .map(([name, prop]) => {
        const isRequired = requiredFields.includes(name);
        const fieldType = isValidFieldType(prop.type) ? prop.type : 'string';
        return {
            id: name,
            displayName: `${name}${isRequired ? ' (required)' : ''}`,
            defaultMatch: false,
            display: true,
            type: fieldType,
            required: isRequired,
        };
    })
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
    return { fields };
}
//# sourceMappingURL=index.js.map