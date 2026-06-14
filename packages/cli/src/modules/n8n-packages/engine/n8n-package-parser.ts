import { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse, UserError } from 'n8n-workflow';
import { ZodError } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import * as WorkflowHelpers from '@/workflow-helpers';

import type { PreparedWorkflow } from '../entities/workflow/workflow-import.types';
import { WorkflowSerializer } from '../entities/workflow/workflow.serializer';
import type { PackageReader } from '../io/package-reader';
import type { ManifestEntry, PackageManifest } from '../spec/manifest.schema';
import { packageManifestSchema } from '../spec/manifest.schema';
import type { SerializedWorkflow } from '../spec/serialized/workflow.schema';

/**
 * Parses the typed entities out of a `.n8np` package — the read-side counterpart
 * to the exporters. It reads through the {@link PackageReader} io interface (so
 * the tar format is just one implementation), knows the package layout, and
 * validates as it goes.
 */
@Service()
export class N8nPackageParser {
	constructor(private readonly workflowSerializer: WorkflowSerializer) {}

	async getManifest(reader: PackageReader): Promise<PackageManifest> {
		try {
			return packageManifestSchema.parse(await reader.readManifest());
		} catch (error) {
			if (error instanceof BadRequestError) throw error;
			if (error instanceof ZodError)
				throw new BadRequestError('Package manifest failed validation');
			throw new BadRequestError('Failed to read package manifest');
		}
	}

	async getWorkflows(reader: PackageReader): Promise<PreparedWorkflow[]> {
		const manifest = await this.getManifest(reader);

		const workflows: PreparedWorkflow[] = [];
		for (const entry of manifest.workflows ?? []) {
			workflows.push(await this.readWorkflow(reader, entry));
		}
		return workflows;
	}

	private async readWorkflow(
		reader: PackageReader,
		entry: ManifestEntry,
	): Promise<PreparedWorkflow> {
		const path = `${entry.target}/workflow.json`;

		let content: Buffer;
		try {
			content = await reader.readFile(path);
		} catch (cause) {
			throw new UserError(`Package manifest references a missing workflow file at ${path}.`, {
				cause,
			});
		}

		const wire = jsonParse<SerializedWorkflow>(content.toString('utf-8'), {
			errorMessage: `Package workflow file at ${path} is not valid JSON.`,
		});

		let entity: WorkflowEntity;
		try {
			const partial = this.workflowSerializer.deserialize(wire);
			entity = Object.assign(new WorkflowEntity(), partial);
		} catch (cause) {
			if (cause instanceof ZodError) {
				throw new UserError(`Package workflow file at ${path} failed schema validation.`, {
					cause,
				});
			}
			throw cause;
		}

		WorkflowHelpers.validateWorkflowStructure(entity);

		return { entity, sourceWorkflowId: entry.id, sourcePublished: wire.isPublished };
	}
}
