import type { LicenseState } from '@n8n/backend-common';
import type { Variables } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { VariableCountLimitReachedError } from '@/errors/variable-count-limit-reached.error';
import { userHasScopes } from '@/permissions.ee/check-access';

import { VariableImporter } from '../variable-importer';
import type { PlacedVariableRequirement, VariableImportPlan } from '../variable.types';
import type { ImportContext } from '../../../n8n-packages.types';

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
): PlacedVariableRequirement {
	return { name, usedByWorkflows, globalPlacement };
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
	const licenseState = mock<LicenseState>();
	licenseState.isVariablesLicensed.mockReturnValue(true);
	licenseState.getMaxVariables.mockReturnValue(-1);
	const importer = new VariableImporter(variablesService, licenseState);
	return { importer, variablesService, licenseState };
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

		it('matches a project-scoped variable in the target project', async () => {
			const { importer, variablesService } = makeImporter();
			variablesService.getAllCached.mockResolvedValue([
				makeVariable({
					id: 'var-project',
					project: { id: 'proj-target' } as Variables['project'],
				}),
			]);

			const plan = await importer.plan(context, {
				requirements: [req('API_URL', ['wf-1'])],
				missingMode: 'do-nothing',
			});

			expect(plan).toEqual({ matched: ['API_URL'], missing: [], creations: [] });
		});

		it('falls back to a global variable when none exists in the target project', async () => {
			const { importer, variablesService } = makeImporter();
			variablesService.getAllCached.mockResolvedValue([makeVariable({ id: 'var-global' })]);

			const plan = await importer.plan(context, {
				requirements: [req('API_URL', ['wf-1'])],
				missingMode: 'do-nothing',
			});

			expect(plan).toEqual({ matched: ['API_URL'], missing: [], creations: [] });
		});

		it('prefers the project-scoped variable over a global one with the same name', async () => {
			const { importer, variablesService } = makeImporter();
			variablesService.getAllCached.mockResolvedValue([
				makeVariable({ id: 'var-global', value: 'https://global.example.com' }),
				makeVariable({
					id: 'var-project',
					value: 'https://project.example.com',
					project: { id: 'proj-target' } as Variables['project'],
				}),
			]);

			const plan = await importer.plan(context, {
				requirements: [req('API_URL', ['wf-1'])],
				missingMode: 'do-nothing',
			});

			expect(plan).toEqual({ matched: ['API_URL'], missing: [], creations: [] });
		});

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
			it('plans a project-scoped creation for a missing variable', async () => {
				const { importer, variablesService } = makeImporter();
				variablesService.getAllCached.mockResolvedValue([]);

				const plan = await importer.plan(context, {
					requirements: [req('API_KEY', ['wf-2', 'wf-1'])],
					missingMode: 'create-stub',
				});

				expect(plan).toEqual({
					matched: [],
					missing: [{ name: 'API_KEY', usedByWorkflows: ['wf-1', 'wf-2'] }],
					creations: [
						{ name: 'API_KEY', projectId: 'proj-target', usedByWorkflows: ['wf-1', 'wf-2'] },
					],
				});
				expect(userHasScopes).toHaveBeenCalledWith(
					context.user,
					['projectVariable:create'],
					false,
					{ projectId: 'proj-target' },
				);
			});

			it('plans a global creation when globalPlacement is true', async () => {
				const { importer, variablesService } = makeImporter();
				variablesService.getAllCached.mockResolvedValue([]);

				const plan = await importer.plan(context, {
					requirements: [req('API_KEY', ['wf-1'], true)],
					missingMode: 'create-stub',
				});

				// No `projectId` on the creation: the stub is destined for the global scope.
				expect(plan).toEqual({
					matched: [],
					missing: [{ name: 'API_KEY', usedByWorkflows: ['wf-1'] }],
					creations: [{ name: 'API_KEY', usedByWorkflows: ['wf-1'] }],
				});
				expect(hasGlobalScope).toHaveBeenCalledWith(context.user, 'variable:create');
			});

			it('does not plan a creation for a requirement that already resolves', async () => {
				const { importer, variablesService } = makeImporter();
				variablesService.getAllCached.mockResolvedValue([makeVariable({ id: 'var-url' })]);

				const plan = await importer.plan(context, {
					requirements: [req('API_URL', ['wf-1'])],
					missingMode: 'create-stub',
				});

				expect(plan).toEqual({ matched: ['API_URL'], missing: [], creations: [] });
				// No creations means the permission preflight must not run at all.
				expect(hasGlobalScope).not.toHaveBeenCalled();
				expect(userHasScopes).not.toHaveBeenCalled();
			});

			it('throws when the user cannot create variables in the project', async () => {
				const { importer, variablesService } = makeImporter();
				variablesService.getAllCached.mockResolvedValue([]);
				vi.mocked(userHasScopes).mockResolvedValue(false);

				await expect(
					importer.plan(context, {
						requirements: [req('API_KEY', ['wf-1'])],
						missingMode: 'create-stub',
					}),
				).rejects.toThrow('You are not allowed to create variables in this project');
			});

			it('throws when the user cannot create global variables', async () => {
				const { importer, variablesService } = makeImporter();
				variablesService.getAllCached.mockResolvedValue([]);
				vi.mocked(hasGlobalScope).mockReturnValue(false);

				await expect(
					importer.plan(context, {
						requirements: [req('API_KEY', ['wf-1'], true)],
						missingMode: 'create-stub',
					}),
				).rejects.toThrow('You are not allowed to create global variables');
			});

			it('throws when variables are not licensed', async () => {
				const { importer, variablesService, licenseState } = makeImporter();
				variablesService.getAllCached.mockResolvedValue([]);
				licenseState.isVariablesLicensed.mockReturnValue(false);

				await expect(
					importer.plan(context, {
						requirements: [req('API_KEY', ['wf-1'])],
						missingMode: 'create-stub',
					}),
				).rejects.toThrow('Your license does not allow variables');
			});

			it('skips the project permission check when the project is pending creation', async () => {
				const { importer, variablesService } = makeImporter();
				variablesService.getAllCached.mockResolvedValue([]);

				const plan = await importer.plan(
					context,
					{
						requirements: [req('API_KEY', ['wf-1'])],
						missingMode: 'create-stub',
					},
					{ projectPendingCreation: true },
				);

				expect(plan).toEqual({
					matched: [],
					missing: [{ name: 'API_KEY', usedByWorkflows: ['wf-1'] }],
					creations: [{ name: 'API_KEY', projectId: 'proj-target', usedByWorkflows: ['wf-1'] }],
				});
				expect(userHasScopes).not.toHaveBeenCalled();
			});

			it('reports a limit failure when creations would exceed the quota', async () => {
				const { importer, variablesService, licenseState } = makeImporter();
				variablesService.getAllCached.mockResolvedValue([]);
				licenseState.getMaxVariables.mockReturnValue(1);

				const plan = await importer.plan(context, {
					requirements: [req('API_KEY', ['wf-1']), req('API_TOKEN', ['wf-1'])],
					missingMode: 'create-stub',
				});

				// The limit failure is reported alongside the plan; it does not erase the creations.
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
					limitFailure: { limit: 1, requested: 2, names: ['API_KEY', 'API_TOKEN'] },
				});
			});

			it('skips the quota check when checkQuota is false', async () => {
				const { importer, variablesService, licenseState } = makeImporter();
				variablesService.getAllCached.mockResolvedValue([]);
				licenseState.getMaxVariables.mockReturnValue(1);

				const plan = await importer.plan(
					context,
					{
						requirements: [req('API_KEY', ['wf-1']), req('API_TOKEN', ['wf-1'])],
						missingMode: 'create-stub',
					},
					{ checkQuota: false },
				);

				// No `limitFailure` key: the over-quota creations pass through unchecked.
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
			});
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

			expect(result).toEqual({ stubbed: [], skippedExisting: [], createdCount: 0 });
			expect(variablesService.create).not.toHaveBeenCalled();
		});

		it('creates an empty stub for a missing variable', async () => {
			const { importer, variablesService } = makeImporter();
			variablesService.getAllCached.mockResolvedValue([]);

			const result = await importer.apply(context, projectCreationPlan);

			expect(variablesService.create).toHaveBeenCalledWith(context.user, {
				key: 'API_KEY',
				type: 'string',
				value: '',
				projectId: 'proj-target',
			});
			expect(result).toEqual({
				stubbed: ['API_KEY'],
				skippedExisting: [],
				createdCount: 1,
			});
		});

		it('creates a global stub not attached to any project', async () => {
			const { importer, variablesService } = makeImporter();
			variablesService.getAllCached.mockResolvedValue([]);

			const result = await importer.apply(context, {
				matched: [],
				missing: [{ name: 'API_KEY', usedByWorkflows: ['wf-1'] }],
				creations: [{ name: 'API_KEY', usedByWorkflows: ['wf-1'] }],
			});

			expect(variablesService.create).toHaveBeenCalledWith(context.user, {
				key: 'API_KEY',
				type: 'string',
				value: '',
			});
			expect(result).toEqual({ stubbed: ['API_KEY'], skippedExisting: [], createdCount: 1 });
		});

		it('skips creation when the variable already exists at its destination', async () => {
			const { importer, variablesService } = makeImporter();
			variablesService.getAllCached.mockResolvedValue([
				makeVariable({
					id: 'var-existing',
					key: 'API_KEY',
					project: { id: 'proj-target' } as Variables['project'],
				}),
			]);

			const result = await importer.apply(context, projectCreationPlan);

			expect(variablesService.create).not.toHaveBeenCalled();
			expect(result).toEqual({
				stubbed: [],
				skippedExisting: ['API_KEY'],
				createdCount: 0,
			});
		});

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
				stubbed: ['API_KEY', 'GLOBAL_KEY'],
				skippedExisting: [],
				createdCount: 2,
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

			const result = await importer.apply(context, projectCreationPlan);

			expect(result).toEqual({
				stubbed: [],
				skippedExisting: ['API_KEY'],
				createdCount: 0,
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

	describe('blockingFailures', () => {
		const plan: VariableImportPlan = {
			matched: ['API_URL'],
			missing: [{ name: 'API_KEY', usedByWorkflows: ['wf-1'] }],
			creations: [],
		};

		describe('do-nothing missing mode', () => {
			it('never blocks, even with unresolved requirements', () => {
				const { importer } = makeImporter();

				expect(
					importer.blockingFailures({ requirements: undefined, missingMode: 'do-nothing' }, plan),
				).toEqual([]);
			});
		});

		describe('create-stub missing mode', () => {
			it('never blocks, since unresolved requirements are created', () => {
				const { importer } = makeImporter();

				expect(
					importer.blockingFailures({ requirements: undefined, missingMode: 'create-stub' }, plan),
				).toEqual([]);
			});
		});

		describe('must-preexist missing mode', () => {
			it('blocks on every unresolved requirement', () => {
				const { importer } = makeImporter();

				expect(
					importer.blockingFailures(
						{ requirements: undefined, missingMode: 'must-preexist' },
						plan,
					),
				).toEqual([{ name: 'API_KEY', usedByWorkflows: ['wf-1'] }]);
			});

			it('does not block when every requirement resolves', () => {
				const { importer } = makeImporter();

				expect(
					importer.blockingFailures(
						{ requirements: undefined, missingMode: 'must-preexist' },
						{ matched: ['API_URL'], missing: [], creations: [] },
					),
				).toEqual([]);
			});
		});
	});
});
