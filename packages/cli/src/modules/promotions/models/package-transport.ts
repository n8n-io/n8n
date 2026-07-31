import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { UserError } from 'n8n-workflow';
import type { Readable } from 'node:stream';

/**
 * In-process package export/import for promotion models that move the unit of
 * work server-side (api-collab destination apply, git-review apply). Wraps the
 * n8n-packages module with the lenient defaults the POC assumes: stubs for
 * missing credentials, merge folders, keep source workflow ids so repeated
 * promotions update rather than duplicate.
 *
 * Unit-of-work types: `project` exports/imports a project package (importing
 * one creates team projects, which needs a license); `workflow` exports a
 * workflow package that lands in the applying user's personal project.
 */

export interface UnitOfWorkRef {
	type: string;
	id: string;
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
	}
	return Buffer.concat(chunks);
}

function exportIds(unitOfWork: UnitOfWorkRef) {
	if (unitOfWork.type === 'project') return { projectIds: [unitOfWork.id] };
	if (unitOfWork.type === 'workflow') return { workflowIds: [unitOfWork.id] };
	throw new UserError(`Unit of work type "${unitOfWork.type}" is not supported`);
}

export async function exportUnitPackage(user: User, unitOfWork: UnitOfWorkRef): Promise<Buffer> {
	const { N8nPackagesService } = await import('../../n8n-packages/n8n-packages.service.js');
	const { stream } = await Container.get(N8nPackagesService).exportPackage({
		user,
		...exportIds(unitOfWork),
	});
	return await streamToBuffer(stream);
}

export async function importUnitPackage(
	user: User,
	packageBuffer: Buffer,
	credentialBindings: Record<string, string> = {},
) {
	const { N8nPackagesService } = await import('../../n8n-packages/n8n-packages.service.js');
	return await Container.get(N8nPackagesService).importPackage({
		user,
		packageBuffer,
		bindings: { credentials: new Map(Object.entries(credentialBindings)) },
		credentialMatchingMode: 'name-and-type',
		credentialMissingMode: 'create-stub',
		workflowConflictPolicy: 'new-version',
		workflowPublishingPolicy: 'match-source',
		workflowIdPolicy: 'source',
		missingNodeTypeMode: 'import-anyway',
		folderConflictPolicy: 'merge',
		dataTableMatchingMode: 'by-id',
		dataTableMissingMode: 'create',
		dataTableSchemaConflictPolicy: 'keep-existing',
		variableMissingMode: 'create-stub',
		tagMissingMode: 'create',
		tagConflictPolicy: 'skip',
	});
}
