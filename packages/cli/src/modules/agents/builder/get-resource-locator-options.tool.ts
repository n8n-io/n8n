import { Tool } from '@n8n/agents/tool';
import type { BuiltTool } from '@n8n/agents';
import {
	collectDynamicNodeParameterPaths,
	detectAuthenticationParameterValue,
	findNodeParameterProperty,
	getDynamicNodeParameterLookup,
	getRequiredNodeCredentialSlots,
	hasNodeCredentials,
	normalizeParameterPath,
	toDynamicParameterPath,
	toLoadedOptionParameterValue,
	toResourceLocatorParameterValue,
} from '@n8n/ai-utilities/node-catalog';
import type { User } from '@n8n/db';
import type { INodeParameters } from 'n8n-workflow';
import { z } from 'zod';

import type { NodeTypes } from '@/node-types';
import type { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { getBase } from '@/workflow-execute-additional-data';

import { BUILDER_TOOLS } from './builder-tool-names';

const nodeCredentialSchema = z.object({
	id: z.string(),
	name: z.string(),
});

const getResourceLocatorOptionsInputSchema = z.object({
	nodeType: z.string().describe('Tool node type identifier from search_nodes'),
	nodeTypeVersion: z.number().describe('Tool node type version from search_nodes'),
	parameterPath: z
		.string()
		.describe(
			'Parameter path to resolve, e.g. "teamId", "calendarId", or "additionalFields.teamId"',
		),
	nodeParameters: z
		.record(z.unknown())
		.optional()
		.describe(
			'Current static nodeParameters for the node, including resource/operation/mode selections and any dependency fields already resolved.',
		),
	credentials: z
		.record(nodeCredentialSchema)
		.optional()
		.describe(
			'Node credentials map returned by ask_credential. Do not copy from list_credentials.',
		),
	filter: z.string().optional().describe('Optional search string to narrow the returned options'),
	paginationToken: z
		.string()
		.optional()
		.describe('Optional pagination token from a previous lookup'),
});

export function buildGetResourceLocatorOptionsTool(deps: {
	dynamicNodeParametersService: DynamicNodeParametersService;
	nodeTypes: NodeTypes;
	user: User;
	projectId: string;
}): BuiltTool {
	return new Tool(BUILDER_TOOLS.GET_RESOURCE_LOCATOR_OPTIONS)
		.description(
			'Fetch live options for a node parameter that is configured through a resourceLocator, loadOptionsMethod, or loadOptions routing. ' +
				'Use this for stable IDs such as Linear teamId, Slack channel, calendar, project, board, model, database, or table selectors before writing nodeParameters. ' +
				'Call ask_credential first when the node needs credentials, then pass the returned credentials map. ' +
				'The response includes parameterValue for each result; write that exact value into nodeParameters instead of using $fromAI for stable resource IDs.',
		)
		.input(getResourceLocatorOptionsInputSchema)
		.handler(
			async ({
				nodeType,
				nodeTypeVersion,
				parameterPath,
				nodeParameters,
				credentials,
				filter,
				paginationToken,
			}) => {
				let nodeTypeDescription;
				try {
					nodeTypeDescription = deps.nodeTypes.getByNameAndVersion(nodeType, nodeTypeVersion);
				} catch (error) {
					return {
						ok: false,
						code: 'node_type_not_found',
						message: error instanceof Error ? error.message : `Node type "${nodeType}" not found`,
					};
				}

				const property = findNodeParameterProperty(
					nodeTypeDescription.description.properties,
					parameterPath,
				);
				if (!property) {
					return {
						ok: false,
						code: 'parameter_not_found',
						message: `Parameter "${parameterPath}" was not found on ${nodeType}.`,
						dynamicParameters: collectDynamicNodeParameterPaths(
							nodeTypeDescription.description.properties,
						),
					};
				}

				const lookup = getDynamicNodeParameterLookup(property);
				if (!lookup) {
					return {
						ok: false,
						code: 'not_dynamic_selector',
						message: `Parameter "${parameterPath}" does not expose a resource locator or load-options lookup.`,
						dynamicParameters: collectDynamicNodeParameterPaths(
							nodeTypeDescription.description.properties,
						),
					};
				}

				const credentialSlots = getRequiredNodeCredentialSlots(nodeTypeDescription.description);
				if (
					credentialSlots.length > 0 &&
					!lookup.skipCredentialsCheck &&
					!hasNodeCredentials(credentials)
				) {
					return {
						ok: false,
						code: 'missing_credentials',
						message:
							'This parameter needs node credentials before live options can be fetched. Call ask_credential for one of the returned credential slots, then retry with the returned credentials map.',
						credentialSlots,
					};
				}

				const currentNodeParameters = (nodeParameters ?? {}) as INodeParameters;
				const resourceIds = { projectId: deps.projectId, credentials };
				await deps.dynamicNodeParametersService.refineResourceIds(deps.user, resourceIds);

				// Auto-detect the authentication parameter value from the credential type.
				// Many nodes (e.g. Google Sheets) use an `authentication` parameter to switch
				// between serviceAccount/oAuth2, and `getNodeParameter('authentication', 0)`
				// falls back to the wrong default when it's not set.
				if (!currentNodeParameters.authentication && resourceIds.credentials) {
					for (const credentialType of Object.keys(resourceIds.credentials)) {
						const authValue = detectAuthenticationParameterValue(
							nodeTypeDescription.description,
							credentialType,
						);
						if (authValue !== undefined) {
							currentNodeParameters.authentication = authValue;
							break;
						}
					}
				}

				const builderHint = property.builderHint?.propertyHint;

				const additionalData = await getBase({
					userId: deps.user.id,
					projectId: resourceIds.projectId,
					currentNodeParameters,
				});
				additionalData.dataTableProjectId = resourceIds.projectId;

				const nodeTypeAndVersion = { name: nodeType, version: nodeTypeVersion };
				const dynamicPath = toDynamicParameterPath(parameterPath);

				try {
					if (lookup.kind === 'resourceLocator') {
						const result = await deps.dynamicNodeParametersService.getResourceLocatorResults(
							lookup.methodName,
							dynamicPath,
							additionalData,
							nodeTypeAndVersion,
							currentNodeParameters,
							resourceIds.credentials,
							filter,
							paginationToken,
						);

						return {
							ok: true,
							kind: lookup.kind,
							parameterPath: normalizeParameterPath(parameterPath),
							methodName: lookup.methodName,
							mode: lookup.mode,
							results: (result.results ?? []).map((option) => ({
								name: option.name,
								value: option.value,
								...(option.url ? { url: option.url } : {}),
								parameterValue: toResourceLocatorParameterValue(option, lookup.mode),
							})),
							paginationToken: result.paginationToken,
							...(builderHint ? { builderHint } : {}),
						};
					}

					const options =
						lookup.kind === 'loadOptionsMethod'
							? await deps.dynamicNodeParametersService.getOptionsViaMethodName(
									lookup.methodName,
									dynamicPath,
									additionalData,
									nodeTypeAndVersion,
									currentNodeParameters,
									resourceIds.credentials,
								)
							: await deps.dynamicNodeParametersService.getOptionsViaLoadOptions(
									lookup.loadOptions,
									additionalData,
									nodeTypeAndVersion,
									currentNodeParameters,
									resourceIds.credentials,
								);

					return {
						ok: true,
						kind: lookup.kind,
						parameterPath: normalizeParameterPath(parameterPath),
						...(lookup.kind === 'loadOptionsMethod' ? { methodName: lookup.methodName } : {}),
						results: options.map((option) => ({
							name: option.name,
							value: option.value,
							...(option.description ? { description: option.description } : {}),
							parameterValue: toLoadedOptionParameterValue(option),
						})),
						...(builderHint ? { builderHint } : {}),
					};
				} catch (error) {
					return {
						ok: false,
						code: 'lookup_failed',
						message: error instanceof Error ? error.message : 'Failed to fetch parameter options',
					};
				}
			},
		)
		.build();
}
