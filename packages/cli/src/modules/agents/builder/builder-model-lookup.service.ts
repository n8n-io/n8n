import type { User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INodeCredentials, INodeParameters } from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { NodeTypes } from '@/node-types';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { getBase } from '@/workflow-execute-additional-data';

import type { ModelLookupConfig } from './interactive/llm-provider-defaults';

@Service()
export class BuilderModelLookupService {
	constructor(
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly projectRepository: ProjectRepository,
		private readonly dynamicNodeParametersService: DynamicNodeParametersService,
		private readonly nodeTypes: NodeTypes,
	) {}

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
