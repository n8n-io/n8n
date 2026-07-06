import type { User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INodeCredentials, INodeParameters } from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { NodeTypes } from '@/node-types';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { getBase } from '@/workflow-execute-additional-data';

import type { ModelLookupConfig } from './interactive/llm-provider-defaults';

/**
 * ⚠️ TEMPORARY BRIDGE to the LangChain chat sub-nodes (`@n8n/n8n-nodes-langchain`).
 *
 * `list` drives a chat sub-node's model list (`searchModels` / `loadOptions`)
 * through `DynamicNodeParametersService` — the same path that fills a node's NDV
 * model dropdown — so the agents feature can verify models against the
 * provider's live API without re-implementing per-provider auth, pagination, and
 * response parsing.
 *
 * This is intentionally the single, narrow seam for that dependency. Don't add
 * other LangChain-node calls elsewhere in the agents feature — route them here.
 *
 * REMOVAL: when the provider-agnostic models component lands, swap the two
 * callers (AgentModelCatalogService, AgentsBuilderToolsService) over to it and
 * delete this file.
 */
@Service()
export class BuilderModelLiveLookupService {
	constructor(
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly projectRepository: ProjectRepository,
		private readonly dynamicNodeParametersService: DynamicNodeParametersService,
		private readonly nodeTypes: NodeTypes,
	) {}

	/**
	 * Fetch a provider's live model list by executing the corresponding LangChain
	 * chat sub-node's list method with the given credential. Returns `{ name,
	 * value }` pairs (value = the provider's model id). Throws if the credential
	 * is missing/inaccessible or the node has no list config.
	 */
	async list(
		user: User,
		credentialId: string,
		credentialType: string,
		lookup: ModelLookupConfig,
	): Promise<Array<{ name: string; value: string }>> {
		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:read'],
		);
		if (!credential || credential.type !== credentialType) {
			throw new Error(`Credential ${credentialId} not found or not accessible`);
		}

		const personalProject = await this.projectRepository.getPersonalProjectForUserOrFail(user.id);
		const currentNodeParameters: INodeParameters = {};
		const credentials: INodeCredentials = {
			[credential.type]: { id: credential.id, name: credential.name },
		};
		const additionalData = await getBase({
			userId: user.id,
			projectId: personalProject.id,
			currentNodeParameters,
		});
		const nodeTypeAndVersion = { name: lookup.nodeType, version: lookup.version };

		if (lookup.kind === 'listSearch') {
			const result = await this.dynamicNodeParametersService.getResourceLocatorResults(
				lookup.methodName,
				'',
				additionalData,
				nodeTypeAndVersion,
				currentNodeParameters,
				credentials,
			);
			return (result.results ?? []).map((r) => ({
				name: String(r.name),
				value: String(r.value),
			}));
		}

		const nodeType = this.nodeTypes.getByNameAndVersion(lookup.nodeType, lookup.version);
		const property = nodeType.description.properties.find((p) => p.name === lookup.propertyName);
		const loadOptions = property?.typeOptions?.loadOptions;
		if (!loadOptions) {
			throw new Error(
				`Property "${lookup.propertyName}" on ${lookup.nodeType} has no loadOptions config`,
			);
		}

		const options = await this.dynamicNodeParametersService.getOptionsViaLoadOptions(
			loadOptions,
			additionalData,
			nodeTypeAndVersion,
			currentNodeParameters,
			credentials,
		);
		return options.map((o) => ({ name: String(o.name), value: String(o.value) }));
	}
}
