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

describe('MCP Client Tool generic OAuth2 description', () => {
	it('should expose the authentication option and its credential picker', () => {
		const { credentials: nodeCredentials, properties } = new McpClientTool().description;
		const authentication = properties
			.filter((property) => property.name === 'authentication')
			.map(({ options, displayOptions }) => ({
				options: options?.filter((option) => 'value' in option && option.value === 'oAuth2Api'),
				displayOptions,
			}));
		const credential = nodeCredentials?.find((entry) => entry.name === 'oAuth2Api');
		const credentialPicker = properties.find((property) => property.name === 'credentials');

		expect({ authentication, credential, credentialPicker }).toMatchInlineSnapshot(`
			{
			  "authentication": [
			    {
			      "displayOptions": {
			        "show": {
			          "@version": [
			            {
			              "_cnd": {
			                "lt": 1.2,
			              },
			            },
			          ],
			        },
			      },
			      "options": [],
			    },
			    {
			      "displayOptions": {
			        "show": {
			          "@version": [
			            {
			              "_cnd": {
			                "gte": 1.2,
			              },
			            },
			          ],
			        },
			      },
			      "options": [
			        {
			          "description": "Use a generic OAuth2 API credential. It has no Resource URL field. If your server needs one, use MCP OAuth2.",
			          "name": "Generic OAuth2 API",
			          "value": "oAuth2Api",
			        },
			      ],
			    },
			  ],
			  "credential": {
			    "displayOptions": {
			      "show": {
			        "authentication": [
			          "oAuth2Api",
			        ],
			      },
			    },
			    "name": "oAuth2Api",
			    "required": true,
			  },
			  "credentialPicker": {
			    "default": "",
			    "displayName": "Credentials",
			    "displayOptions": {
			      "show": {
			        "authentication": [
			          "headerAuth",
			          "bearerAuth",
			          "mcpOAuth2Api",
			          "oAuth2Api",
			          "multipleHeadersAuth",
			        ],
			      },
			    },
			    "name": "credentials",
			    "type": "credentials",
			  },
			}
		`);
	});
});
