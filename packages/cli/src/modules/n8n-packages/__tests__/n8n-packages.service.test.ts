import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { ImportOutcome } from '../engine/import-telemetry';
import type { N8nPackageParser } from '../engine/n8n-package-parser';
import type { ProjectPackageImporter } from '../engine/project-package-importer';
import { N8nPackagesService } from '../n8n-packages.service';
import type {
	ImportPackageRequest,
	ImportPackageSelectionRequest,
	ImportResult,
} from '../n8n-packages.types';
import type { PackageManifest } from '../spec/manifest.schema';

describe('N8nPackagesService', () => {
	const packageParser = mock<N8nPackageParser>();
	const projectPackageImporter = mock<ProjectPackageImporter>();
	const service = new N8nPackagesService(
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		packageParser,
		mock(),
		projectPackageImporter,
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
	);

	const user = mock<User>({ id: 'user-1' });
	const packageBuffer = Buffer.from('package');
	const outcome: ImportOutcome = { result: mock<ImportResult>(), scopes: [], agentOutcomes: [] };

	const importRequest: ImportPackageRequest = {
		user,
		publicApi: false,
		packageBuffer,
		projectConflictPolicy: 'merge',
		conflictPolicy: 'new-version',
		idPolicy: 'source',
		publishingPolicy: 'match-source',
		missingNodeTypeMode: 'fail',
		credentialMatchingMode: 'id-only',
		credentialMissingMode: 'must-preexist',
		overwriteDeletionPolicy: 'archive',
		dataTableMatchingMode: 'by-id',
		dataTableMissingMode: 'create',
		dataTableSchemaConflictPolicy: 'fail',
		variableMissingMode: 'must-preexist',
		variableConflictPolicy: 'keep-existing',
		tagMissingMode: 'create',
		tagConflictPolicy: 'skip',
	};
	const selectionRequest: ImportPackageSelectionRequest = { user, publicApi: false, packageBuffer };
	const selection = { selectedProjectId: 'project-1', selectedWorkflowIds: ['workflow-1'] };
	// A request body that holds the promotion-only option, as a request DTO with the field would.
	const promotionOnlyOptions = { allowUnresolvedCredentialIds: ['credential-1'] };

	beforeEach(() => {
		vi.clearAllMocks();
		packageParser.getManifest.mockResolvedValue(
			mock<PackageManifest>({
				projects: [{ id: 'project-1', name: 'Project', target: 'projects/project-1' }],
				agents: undefined,
				folders: undefined,
				workflows: undefined,
			}),
		);
		projectPackageImporter.import.mockResolvedValue(outcome);
	});

	describe('importPackage', () => {
		it('imports the package without the option to leave a credential unresolved', async () => {
			await service.importPackage(
				// @ts-expect-error The request type of the public import refuses this option.
				{ ...importRequest, ...promotionOnlyOptions },
			);

			const [engineRequest] = projectPackageImporter.import.mock.calls[0];
			expect(engineRequest).toMatchObject({ user, conflictPolicy: 'new-version' });
			expect(engineRequest).not.toHaveProperty('allowUnresolvedCredentialIds');
		});
	});

	describe('importPackageSelection', () => {
		it('imports the selection without the option to leave a credential unresolved', async () => {
			await service.importPackageSelection(
				// @ts-expect-error The request type of the public import refuses this option.
				{ ...selectionRequest, ...promotionOnlyOptions },
				selection,
			);

			const [engineRequest] = projectPackageImporter.import.mock.calls[0];
			expect(engineRequest).toMatchObject({ user, selection });
			expect(engineRequest).not.toHaveProperty('allowUnresolvedCredentialIds');
		});
	});

	describe('planPackageSelection', () => {
		it('plans with the credentials that the caller lets the import leave unresolved', async () => {
			await service.planPackageSelection(
				{ user, publicApi: false, ...promotionOnlyOptions },
				mock(),
				selection,
				'enforce',
			);

			const [engineRequest] = projectPackageImporter.planImport.mock.calls[0];
			expect(engineRequest).toMatchObject(promotionOnlyOptions);
		});
	});

	describe('planPackage', () => {
		it('plans with the credentials that the caller lets the import leave unresolved', async () => {
			const { packageBuffer: _, ...request } = importRequest;

			await service.planPackage({ ...request, ...promotionOnlyOptions }, mock(), 'enforce');

			const [engineRequest] = projectPackageImporter.planImport.mock.calls[0];
			expect(engineRequest).toMatchObject(promotionOnlyOptions);
		});
	});
});
