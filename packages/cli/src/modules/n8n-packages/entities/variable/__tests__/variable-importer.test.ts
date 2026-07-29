import type { Variables } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { VariableCountLimitReachedError } from '@/errors/variable-count-limit-reached.error';
import { userHasScopes } from '@/permissions.ee/check-access';

import type { ImportContext } from '../../../n8n-packages.types';
import { VariableImporter } from '../variable-importer';
import type {
	PlacedVariableRequirement,
	VariableImportPlan,
	VariableImportRequest,
} from '../variable.types';

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

function req(
	name: string,
	usedByWorkflows: string[],
	globalPlacement = false,
	values: Partial<Pick<PlacedVariableRequirement, 'value' | 'packageValue'>> = {},
): PlacedVariableRequirement {
	return { name, usedByWorkflows, globalPlacement, ...values };
}

function makeVariable(overrides: Partial<Variables> = {}): Variables {
	return {
		id: 'var-1',
		key: 'API_URL',
		type: 'string',
		value: 'https://api.example.com',
		project: null,
		...overrides,
	} as unknown as Variables;
}

function makeImporter() {
	const variablesService = mock<VariablesService>();
	variablesService.getRemainingVariableQuota.mockResolvedValue(null);
	const importer = new VariableImporter(variablesService);
	return { importer, variablesService };
}

beforeEach(() => {
	vi.mocked(hasGlobalScope).mockReturnValue(true);
	vi.mocked(userHasScopes).mockResolvedValue(true);
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('VariableImporter', () => {
	describe('plan', () => {
		it('returns an empty plan and skips the service when there are no requirements', async () => {
			const { importer, variablesService } = makeImporter();

			const plan = await importer.plan(context, {
				requirements: undefined,
				missingMode: 'do-nothing',
			});

			expect(plan).toEqual({ matched: [], missing: [], creations: [] });
			expect(variablesService.getAllCached).not.toHaveBeenCalled();
		});

		it('returns an empty plan for an empty requirements list', async () => {
			const { importer, variablesService } = makeImporter();

			const plan = await importer.plan(context, {
				requirements: [],
				missingMode: 'do-nothing',
			});

			expect(plan).toEqual({ matched: [], missing: [], creations: [] });
			expect(variablesService.getAllCached).not.toHaveBeenCalled();
		});

		it('reports an unresolved requirement when no variable resolves in the project or globally', async () => {
			const { importer, variablesService } = makeImporter();
			variablesService.getAllCached.mockResolvedValue([]);

			const plan = await importer.plan(context, {
				requirements: [req('API_URL', ['wf-1'])],
				missingMode: 'do-nothing',
			});

			expect(plan).toEqual({
				matched: [],
				missing: [{ name: 'API_URL', usedByWorkflows: ['wf-1'] }],
				creations: [],
			});
		});

		it('dedupes and sorts usedByWorkflows on unresolved requirements', async () => {
			const { importer, variablesService } = makeImporter();
			variablesService.getAllCached.mockResolvedValue([]);

			const plan = await importer.plan(context, {
				requirements: [req('API_URL', ['wf-2', 'wf-1', 'wf-2'])],
				missingMode: 'do-nothing',
			});

			expect(plan).toEqual({
				matched: [],
				missing: [{ name: 'API_URL', usedByWorkflows: ['wf-1', 'wf-2'] }],
				creations: [],
			});
		});

		// Project-over-global precedence is pickVariableForProject's contract, tested in
		// packages/workflow/test/resolve-variables.test.ts; plan() only reports matched names.
		it('does not match a project-scoped variable from a different project', async () => {
			const { importer, variablesService } = makeImporter();
			variablesService.getAllCached.mockResolvedValue([
				makeVariable({
					id: 'var-other',
					project: { id: 'proj-other' } as Variables['project'],
				}),
			]);

			const plan = await importer.plan(context, {
				requirements: [req('API_URL', ['wf-1'])],
				missingMode: 'do-nothing',
			});

			expect(plan).toEqual({
				matched: [],
				missing: [{ name: 'API_URL', usedByWorkflows: ['wf-1'] }],
				creations: [],
			});
		});

		it('classifies each requirement independently', async () => {
			const { importer, variablesService } = makeImporter();
			variablesService.getAllCached.mockResolvedValue([
				makeVariable({ id: 'var-url', key: 'API_URL' }),
			]);

			const plan = await importer.plan(context, {
				requirements: [req('API_URL', ['wf-1']), req('API_KEY', ['wf-1'])],
				missingMode: 'do-nothing',
			});

			expect(plan).toEqual({
				matched: ['API_URL'],
				missing: [{ name: 'API_KEY', usedByWorkflows: ['wf-1'] }],
				creations: [],
			});
		});

		describe('create-stub', () => {
			it('leaves the quota alone: planning never reports a limit failure', async () => {
				const { importer, variablesService } = makeImporter();
				variablesService.getAllCached.mockResolvedValue([]);

				const plan = await importer.plan(context, {
					requirements: [req('API_KEY', ['wf-1']), req('API_TOKEN', ['wf-1'])],
					missingMode: 'create-stub',
				});

				expect(plan).toEqual({
					matched: [],
					missing: [
						{ name: 'API_KEY', usedByWorkflows: ['wf-1'] },
						{ name: 'API_TOKEN', usedByWorkflows: ['wf-1'] },
					],
					creations: [
						{ name: 'API_KEY', projectId: 'proj-target', usedByWorkflows: ['wf-1'] },
						{ name: 'API_TOKEN', projectId: 'proj-target', usedByWorkflows: ['wf-1'] },
					],
				});
				expect(variablesService.getRemainingVariableQuota).not.toHaveBeenCalled();
			});
		});

		describe('create-with-value', () => {
			async function planCreation(
				requirement: PlacedVariableRequirement,
				missingMode: VariableImportRequest['missingMode'],
			) {
				const { importer, variablesService } = makeImporter();
				variablesService.getAllCached.mockResolvedValue([]);

				const plan = await importer.plan(context, { requirements: [requirement], missingMode });

				return plan.creations[0];
			}

			it("takes the bundled file's value over the requirement's own", async () => {
				const requirement = req('API_KEY', ['wf-1'], false, {
					value: 'from-requirement',
					packageValue: 'from-bundle',
				});

				await expect(planCreation(requirement, 'create-with-value')).resolves.toEqual({
					name: 'API_KEY',
					projectId: 'proj-target',
					value: 'from-bundle',
					usedByWorkflows: ['wf-1'],
				});
			});

			it("falls back to the requirement's value when the package bundles no file", async () => {
				const requirement = req('API_KEY', ['wf-1'], false, { value: 'from-requirement' });

				await expect(planCreation(requirement, 'create-with-value')).resolves.toMatchObject({
					value: 'from-requirement',
				});
			});

			it('plans an empty stub when neither source carries a value', async () => {
				await expect(
					planCreation(req('API_KEY', ['wf-1']), 'create-with-value'),
				).resolves.not.toHaveProperty('value');
			});

			it('ignores both values under create-stub', async () => {
				const requirement = req('API_KEY', ['wf-1'], false, {
					value: 'from-requirement',
					packageValue: 'from-bundle',
				});

				await expect(planCreation(requirement, 'create-stub')).resolves.not.toHaveProperty('value');
			});
		});
	});

	describe('assertCanCreate', () => {
		it('skips the project permission check when the project is pending creation', async () => {
			const { importer } = makeImporter();
			const creations = [{ name: 'API_KEY', projectId: 'proj-target', usedByWorkflows: ['wf-1'] }];

			await expect(importer.assertCanCreate(context, creations, true)).resolves.toBeUndefined();

			expect(userHasScopes).not.toHaveBeenCalled();
		});
	});

	describe('quotaFailure', () => {
		// Overrun reporting and per-destination deduping are computeVariableLimitFailure's and
		// dedupeCreationsByDestination's contracts, tested in variable.types.test.ts.
		it('does not read the quota when the import creates nothing', async () => {
			const { importer, variablesService } = makeImporter();

			await expect(importer.quotaFailure([])).resolves.toBeUndefined();
			expect(variablesService.getRemainingVariableQuota).not.toHaveBeenCalled();
		});
	});

	describe('apply', () => {
		const projectCreationPlan: VariableImportPlan = {
			matched: [],
			missing: [{ name: 'API_KEY', usedByWorkflows: ['wf-1'] }],
			creations: [{ name: 'API_KEY', projectId: 'proj-target', usedByWorkflows: ['wf-1'] }],
		};

		it('does nothing when there are no creations', async () => {
			const { importer, variablesService } = makeImporter();

			const result = await importer.apply(context, {
				matched: ['API_URL'],
				missing: [],
				creations: [],
			});

			expect(result).toEqual({ created: [], stubbed: [], skippedExisting: [] });
			expect(variablesService.create).not.toHaveBeenCalled();
		});

		// The valued and value-less creations are asserted against real rows by the import
		// integration suites; a bundled-but-empty value is the case only this split decides.
		it('reports a creation with an empty package value as stubbed, not created', async () => {
			const { importer, variablesService } = makeImporter();
			variablesService.getAllCached.mockResolvedValue([]);

			const result = await importer.apply(context, {
				...projectCreationPlan,
				creations: [{ ...projectCreationPlan.creations[0], value: '' }],
			});

			expect(result).toEqual({ created: [], stubbed: ['API_KEY'], skippedExisting: [] });
		});

		// Stub, valued and global creations, and the skip when the destination is already
		// occupied, are asserted against real rows by the import integration suites.
		it('still creates when a variable with the same name exists in a different scope', async () => {
			const { importer, variablesService } = makeImporter();
			// An existing global variable must not cancel a planned project creation of the same name,
			// and one in another project must not cancel a planned global creation — only a variable at
			// the exact destination counts.
			variablesService.getAllCached.mockResolvedValue([
				makeVariable({ id: 'var-global', key: 'API_KEY', project: null }),
				makeVariable({
					id: 'var-other-project',
					key: 'GLOBAL_KEY',
					project: { id: 'proj-other' } as Variables['project'],
				}),
			]);

			const result = await importer.apply(context, {
				matched: [],
				missing: [
					{ name: 'API_KEY', usedByWorkflows: ['wf-1'] },
					{ name: 'GLOBAL_KEY', usedByWorkflows: ['wf-1'] },
				],
				creations: [
					{ name: 'API_KEY', projectId: 'proj-target', usedByWorkflows: ['wf-1'] },
					{ name: 'GLOBAL_KEY', usedByWorkflows: ['wf-1'] },
				],
			});

			// Exactly two creates, in plan order — one per planned destination.
			expect(variablesService.create.mock.calls).toEqual([
				[context.user, { key: 'API_KEY', type: 'string', value: '', projectId: 'proj-target' }],
				[context.user, { key: 'GLOBAL_KEY', type: 'string', value: '' }],
			]);
			expect(result).toEqual({
				created: [],
				stubbed: ['API_KEY', 'GLOBAL_KEY'],
				skippedExisting: [],
			});
		});

		it('treats a concurrent create as a skip when the variable now exists at the destination', async () => {
			const { importer, variablesService } = makeImporter();
			variablesService.getAllCached.mockResolvedValueOnce([]).mockResolvedValueOnce([
				makeVariable({
					id: 'var-concurrent',
					key: 'API_KEY',
					project: { id: 'proj-target' } as Variables['project'],
				}),
			]);
			variablesService.create.mockRejectedValue(
				new VariableCountLimitReachedError('Variables limit reached'),
			);

			const result = await importer.apply(context, {
				...projectCreationPlan,
				creations: [
					{
						name: 'API_KEY',
						projectId: 'proj-target',
						value: 'package-value',
						usedByWorkflows: ['wf-1'],
					},
				],
			});

			expect(result).toEqual({
				created: [],
				stubbed: [],
				skippedExisting: ['API_KEY'],
			});
		});

		it('rethrows a genuine quota failure when the destination is still empty', async () => {
			const { importer, variablesService } = makeImporter();
			variablesService.getAllCached.mockResolvedValue([]);
			variablesService.create.mockRejectedValue(
				new VariableCountLimitReachedError('Variables limit reached'),
			);

			await expect(importer.apply(context, projectCreationPlan)).rejects.toThrow(
				VariableCountLimitReachedError,
			);
		});
	});
});
