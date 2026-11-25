import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { McpClient } from '../../McpClient/McpClient.node';
import { McpClientTool } from '../../McpClientTool/McpClientTool.node';
import { credentials } from '../descriptions';

const shownFor = (displayOptions: INodeProperties['displayOptions']) =>
	(displayOptions?.show?.authentication ?? []) as string[];

describe.each([
	['MCP Client', new McpClient().description.properties],
	['MCP Client Tool', new McpClientTool().description.properties],
])('%s authentication options', (_, properties) => {
	const authValues = properties
		.filter((property) => property.name === 'authentication')
		.flatMap((property) => property.options as INodePropertyOptions[])
		.map((option) => option.value as string)
		.filter((value) => value !== 'none');
	const credentialSlot = properties.find((property) => property.name === 'credentials');

	it('should offer the generic OAuth2 credential', () => {
		expect(authValues).toContain('oAuth2Api');
	});

	it.each([...new Set(authValues)])('should show a credential picker for %s', (value) => {
		expect(shownFor(credentialSlot?.displayOptions)).toContain(value);
		expect(
			credentials.some((credential) => shownFor(credential.displayOptions).includes(value)),
		).toBe(true);
	});
});
