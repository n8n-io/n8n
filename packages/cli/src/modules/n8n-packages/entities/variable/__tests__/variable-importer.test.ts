import type { Variables } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { VariableCountLimitReachedError } from '@/errors/variable-count-limit-reached.error';
import { userHasScopes } from '@/permissions.ee/check-access';

import type { ImportContext } from '../../../n8n-packages.types';
import { VariableImporter } from '../variable-importer';
import type { VariableImportPlan } from '../variable.types';

vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/permissions')>()),
	hasGlobalScope: vi.fn(),
}));

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn(),
}));

const context: ImportContext = {
	user: mock(),
	projectId: 'proj-target',
	folderId: null,
};

function makeImporter() {
	const variablesService = mock<VariablesService>();
	variablesService.getRemainingVariableQuota.mockResolvedValue(null);
	return { importer: new VariableImporter(variablesService), variablesService };
}

beforeEach(() => {
	vi.mocked(hasGlobalScope).mockReturnValue(true);
	vi.mocked(userHasScopes).mockResolvedValue(true);
});

afterEach(() => {
	vi.clearAllMocks();
});

/**
 * Planning, placement, permission and quota behaviour is asserted against real rows by the
 * workflow and project import integration suites. Only the two cases they cannot reach live here.
 */
describe('VariableImporter.apply', () => {
	const projectCreationPlan: VariableImportPlan = {
		matched: [],
		missing: [{ name: 'API_KEY', usedByWorkflows: ['wf-1'] }],
		creations: [{ name: 'API_KEY', projectId: 'proj-target', usedByWorkflows: ['wf-1'] }],
	};

	it('reports a creation with an empty package value as stubbed, not created', async () => {
		const { importer, variablesService } = makeImporter();
		variablesService.getAllCached.mockResolvedValue([]);

		const result = await importer.apply(context, {
			...projectCreationPlan,
			creations: [{ ...projectCreationPlan.creations[0], value: '' }],
		});

		expect(result).toEqual({ created: [], stubbed: ['API_KEY'], skippedExisting: [] });
	});

	it('treats a concurrent create as a skip when the variable now exists at the destination', async () => {
		const { importer, variablesService } = makeImporter();
		variablesService.getAllCached.mockResolvedValueOnce([]).mockResolvedValueOnce([
			mock<Variables>({
				id: 'var-concurrent',
				key: 'API_KEY',
				project: { id: 'proj-target' } as Variables['project'],
			}),
		]);
		variablesService.create.mockRejectedValue(
			new VariableCountLimitReachedError('Variables limit reached'),
		);

		const result = await importer.apply(context, projectCreationPlan);

		expect(result).toEqual({ created: [], stubbed: [], skippedExisting: ['API_KEY'] });
	});
});
