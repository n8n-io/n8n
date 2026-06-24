import type { User, ProjectRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { EventService } from '@/events/event.service';
import type { FolderService } from '@/services/folder.service';
import type { ProjectService } from '@/services/project.service.ee';

import type { CredentialImporter } from '../../entities/credential/credential-importer';
import type { CredentialResolution } from '../../entities/credential/credential.types';
import type { WorkflowImportPlan } from '../../entities/workflow/workflow-import.types';
import type { WorkflowImporter } from '../../entities/workflow/workflow-importer';
import type { WorkflowPublisher } from '../../entities/workflow/workflow-publisher';
import type { PackageReader } from '../../io/package-reader';
import type { PackageImportConfig } from '../../n8n-packages.config';
import {
	WorkflowConflictPolicy,
	WorkflowIdPolicy,
	WorkflowPublishingPolicy,
	type ImportContext,
	type ImportPackageRequest,
} from '../../n8n-packages.types';
import type { PackageManifest } from '../../spec/manifest.schema';
import { ImportPipeline } from '../import-pipeline';
import type { N8nPackageParser } from '../n8n-package-parser';

describe('ImportPipeline.validate', () => {
	const context: ImportContext = {
		user: mock<User>({ id: 'user-1' }),
		projectId: 'project-1',
		folderId: null,
	};

	const request: ImportPackageRequest = {
		user: context.user,
		packageBuffer: Buffer.alloc(0),
		credentialMatchingMode: 'id-only',
		credentialMissingMode: 'must-preexist',
		workflowConflictPolicy: WorkflowConflictPolicy.NewVersion,
		workflowPublishingPolicy: WorkflowPublishingPolicy.PreservePublishedState,
		workflowIdPolicy: WorkflowIdPolicy.Source,
	};

	const manifest = mock<PackageManifest>({
		requirements: {
			credentials: [{ id: 'cred-1', name: 'GitHub', type: 'githubApi', usedByWorkflows: ['wf-1'] }],
		},
	});

	const emptyWorkflowPlan: WorkflowImportPlan = {
		items: [],
		conflicts: [],
		idConflicts: [],
		folderConflicts: [],
	};

	function buildPipeline(overrides: {
		credentialPlan: CredentialResolution;
		blockingFailures: ReturnType<CredentialImporter['blockingFailures']>;
	}) {
		const packageParser = mock<N8nPackageParser>();
		packageParser.getManifest.mockResolvedValue(manifest);
		packageParser.getWorkflows.mockResolvedValue([]);

		const credentialImporter = mock<CredentialImporter>();
		credentialImporter.plan.mockResolvedValue(overrides.credentialPlan);
		credentialImporter.blockingFailures.mockReturnValue(overrides.blockingFailures);

		const workflowImporter = mock<WorkflowImporter>();
		workflowImporter.plan.mockResolvedValue(emptyWorkflowPlan);

		const pipeline = new ImportPipeline(
			packageParser,
			credentialImporter,
			mock<PackageImportConfig>(),
			mock<ProjectRepository>(),
			mock<ProjectService>(),
			mock<FolderService>(),
			mock<EventService>(),
			workflowImporter,
			mock<WorkflowPublisher>(),
		);

		return { pipeline, credentialImporter, workflowImporter };
	}

	it('returns a credential-unresolved blocking issue for a missing credential', async () => {
		const { pipeline } = buildPipeline({
			credentialPlan: { successes: new Map(), failures: [] },
			blockingFailures: [
				{
					kind: 'not_found',
					sourceId: 'cred-1',
					usedByWorkflows: ['wf-1'],
				},
			],
		});

		const issues = await pipeline.validate(mock<PackageReader>(), context, request);

		expect(issues).toEqual([
			{
				type: 'credential-unresolved',
				kind: 'not_found',
				sourceId: 'cred-1',
				usedByWorkflows: ['wf-1'],
			},
		]);
	});

	it('returns no issues when every credential resolves', async () => {
		const { pipeline } = buildPipeline({
			credentialPlan: { successes: new Map([['cred-1', 'local-cred-1']]), failures: [] },
			blockingFailures: [],
		});

		const issues = await pipeline.validate(mock<PackageReader>(), context, request);

		expect(issues).toEqual([]);
	});

	it('never calls any apply() — it only runs plan stages (no DB writes)', async () => {
		const { pipeline, credentialImporter, workflowImporter } = buildPipeline({
			credentialPlan: { successes: new Map(), failures: [] },
			blockingFailures: [{ kind: 'not_found', sourceId: 'cred-1', usedByWorkflows: ['wf-1'] }],
		});

		await pipeline.validate(mock<PackageReader>(), context, request);

		expect(credentialImporter.plan).toHaveBeenCalledTimes(1);
		expect(workflowImporter.plan).toHaveBeenCalledTimes(1);
		expect(credentialImporter.apply).not.toHaveBeenCalled();
		expect(workflowImporter.apply).not.toHaveBeenCalled();
	});
});
