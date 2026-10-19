import { isCredentialAgentIntegration, N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { AgentDefinitionService } from '@/modules/agents/agent-definition.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import type { AgentDefinition } from '@/modules/agents/utils/agent-definition';

import type { PreparedAgentExport } from './agent-export.types';
import { AgentSerializer } from './agent.serializer';
import { formatEntityFile } from '../../io/entity-file-format';
import {
	agentMetadataFilePath,
	packageDirectory,
	writeManifestEntry,
} from '../../io/manifest-entry';
import type { PackageWriter } from '../../io/package-writer';
import { ExportVersionPolicy } from '../../n8n-packages.types';
import type { ManifestEntry } from '../../spec/manifest.schema';
import { PackageExportBlockedError } from '../package-export.errors';

@Service()
export class AgentExporter {
	constructor(
		private readonly definitionService: AgentDefinitionService,
		private readonly serializer: AgentSerializer,
	) {}

	async prepare(
		agent: Agent,
		policy: ExportVersionPolicy = ExportVersionPolicy.Latest,
	): Promise<PreparedAgentExport | undefined> {
		if (agent.activeVersionId === null) {
			if (policy === ExportVersionPolicy.IgnoreUnpublished) return undefined;
			if (policy === ExportVersionPolicy.PublishedStrict) {
				throw new PackageExportBlockedError(
					`Agent "${agent.id}" has no published version. Export aborted.`,
				);
			}
		}

		let definition: AgentDefinition;
		let versionId = agent.versionId;
		let integrations = agent.integrations ?? [];
		if (policy !== ExportVersionPolicy.Latest && agent.activeVersionId !== null) {
			const version = agent.activeVersion;
			if (!version) {
				throw new UnexpectedError('Published version was not loaded for Agent', {
					extra: { agentId: agent.id, activeVersionId: agent.activeVersionId },
				});
			}
			definition = await this.definitionService.readVersion(version);
			versionId = version.versionId;
			integrations = [
				...integrations.filter(isCredentialAgentIntegration),
				...(definition.schema?.integrations ?? []).filter(
					({ type }) => type === N8N_CHAT_INTEGRATION_TYPE,
				),
			];
		} else {
			definition = await this.definitionService.readDraft(agent);
		}

		const content = this.serializer.serialize(agent, definition, integrations);
		return {
			projectId: agent.projectId,
			content,
			metadata: this.serializer.serializeMetadata({
				versionId,
				activeVersionId: agent.activeVersionId,
			}),
		};
	}

	async write(
		snapshot: PreparedAgentExport,
		writer: PackageWriter,
		basePrefix = '',
	): Promise<ManifestEntry> {
		const entry = await writeManifestEntry(
			writer,
			'agents',
			packageDirectory('agents', basePrefix),
			snapshot.content,
			snapshot.content,
		);
		await writer.writeFile(
			agentMetadataFilePath(entry.target),
			formatEntityFile(snapshot.metadata),
		);
		return entry;
	}
}
