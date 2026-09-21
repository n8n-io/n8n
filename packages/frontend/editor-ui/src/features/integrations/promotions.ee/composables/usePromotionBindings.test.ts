import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { ResponseError } from '@n8n/rest-api-client';
import type { ApplyPackageResultDto } from '@n8n/api-types';
import { promotionBindingKey, usePromotionBindings } from './usePromotionBindings';
import { continueApplyPackage } from '../promotionsApply.api';
import {
	applied,
	blocked,
	consumers,
	credential,
	savedCredential,
	variable,
} from '../__tests__/bindings.fixtures';
import type { CreatedPromotionBinding, MissingPromotionBinding } from '../promotions.types';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ publicApiContext: { baseUrl: '/custom/api/v1' } }),
}));
vi.mock('../promotionsApply.api');

beforeEach(() => vi.resetAllMocks());

it('resolves shared credentials once and keeps variable scopes separate', async () => {
	const projectVariable: Extract<MissingPromotionBinding, { kind: 'variable' }> = {
		...variable,
		scope: { kind: 'project', project: consumers[0].project },
	};
	const otherProjectVariable: Extract<MissingPromotionBinding, { kind: 'variable' }> = {
		...variable,
		scope: { kind: 'project', project: consumers[1].project },
	};
	const session = usePromotionBindings();
	const result = blocked({
		missingBindings: [credential, variable, projectVariable, otherProjectVariable],
	});
	session.start(result);
	expect(session.originalResult.value).toBe(result);
	expect(session.unresolvedCount.value).toBe(4);
	expect(session.groups.value.map((group) => group.project.id)).toEqual(['team-a', 'team-b']);
	const create = vi.fn().mockResolvedValue(savedCredential);
	await session.createBinding(promotionBindingKey(credential), create);
	expect(create.mock.calls[0][0]).toBe(credential);
	expect(session.unresolvedCount.value).toBe(3);
	expect(session.groups.value.map((group) => group.workflows[0].rows[0].status)).toEqual([
		'resolved',
		'resolved',
	]);
	await session.createBinding(promotionBindingKey(projectVariable), async () => ({
		kind: 'variable',
		id: 'var-1',
		name: variable.name,
		scope: projectVariable.scope,
	}));
	expect(session.unresolvedCount.value).toBe(2);
	expect(session.savedResources.value).toEqual([
		savedCredential,
		{ kind: 'variable', id: 'var-1', name: variable.name, scope: projectVariable.scope },
	]);
});

it.each([
	['cancelled', null],
	['wrong source ID', { ...savedCredential, sourceId: 'other' }],
	['wrong saved ID', { ...savedCredential, id: 'other' }],
	['wrong owner', { ...savedCredential, projectId: 'team-a' }],
	['wrong type', { ...savedCredential, credentialType: 'other' }],
] as const)('keeps a credential unresolved when creation returns %s', async (_label, result) => {
	const session = usePromotionBindings();
	session.start(blocked());
	await session.createBinding(promotionBindingKey(credential), async () => result);
	expect(session.unresolvedCount.value).toBe(1);
	expect(session.savedResources.value).toEqual([]);
	expect(session.canContinue.value).toBe(false);
});

it('keeps global variables unresolved after a project variable is saved', async () => {
	const session = usePromotionBindings();
	session.start(blocked({ missingBindings: [variable] }));
	await session.createBinding(promotionBindingKey(variable), async (item) => {
		expect(item).toBe(variable);
		return {
			kind: 'variable',
			name: variable.name,
			id: 'var-id',
			scope: { kind: 'project', project: consumers[0].project },
		};
	});
	expect(session.error.value).toBe('creationMismatch');
	expect(session.canContinue.value).toBe(false);
});

it('guards creation and Continue while the editor is open and recovers after failure', async () => {
	const pending = createDeferredPromise<CreatedPromotionBinding | null>();
	const session = usePromotionBindings();
	session.start(blocked());
	const create = vi.fn().mockReturnValue(pending.promise);
	const first = session.createBinding(promotionBindingKey(credential), create);
	await session.createBinding(promotionBindingKey(credential), create);
	await session.continueApply();
	expect(create).toHaveBeenCalledTimes(1);
	expect(continueApplyPackage).not.toHaveBeenCalled();
	expect(session.isCreating.value).toBe(true);
	pending.reject(new Error('Save failed'));
	await first;
	expect(session.error.value).toBe('create');
	expect(session.isCreating.value).toBe(false);
	expect(session.unresolvedCount.value).toBe(1);
});

it.each(['access', 'conflict'] as const)('blocks Continue for %s requirements', async (kind) => {
	const session = usePromotionBindings();
	session.start(
		blocked({
			missingBindings: [],
			accessRequirements: kind === 'access' ? [{ ...credential, code: 'access-required' }] : [],
			conflicts:
				kind === 'conflict'
					? [
							{
								kind: 'variable',
								name: variable.name,
								code: 'missing-definition',
								referenceFiles: ['workflow.json'],
								consumers,
							},
						]
					: [],
		}),
	);
	expect(session.canContinue.value).toBe(false);
	expect(session.unresolvedCount.value).toBe(1);
	await session.continueApply();
	expect(continueApplyPackage).not.toHaveBeenCalled();
});

it('counts credentials with the same name and different types separately', () => {
	const session = usePromotionBindings();
	session.start(
		blocked({
			missingBindings: [],
			conflicts: ['githubApi', 'gitlabApi'].map((type) => ({
				kind: 'credential',
				code: 'missing-id',
				sourceId: null,
				name: 'Production',
				expectedTypes: [type],
				consumers,
				referenceFiles: ['workflow.json'],
			})),
		}),
	);
	expect(session.unresolvedCount.value).toBe(2);
	expect(session.canContinue.value).toBe(false);
});

it('submits once with the original source and allows warnings', async () => {
	const pending = createDeferredPromise<ApplyPackageResultDto>();
	vi.mocked(continueApplyPackage).mockReturnValue(pending.promise);
	const session = usePromotionBindings();
	const result = blocked({ missingBindings: [], warnings: applied.warnings });
	session.start(result);
	expect(session.canContinue.value).toBe(true);
	const first = session.continueApply();
	await session.continueApply();
	expect(continueApplyPackage).toHaveBeenCalledTimes(1);
	expect(continueApplyPackage).toHaveBeenCalledWith(
		{ baseUrl: '/custom/api/v1' },
		result.connectionId,
		{ expectedSource: { configId: result.configId, ...result.git } },
	);
	pending.resolve(applied);
	expect(await first).toBe(applied);
	expect(session.canContinue.value).toBe(false);
	await session.continueApply();
	expect(continueApplyPackage).toHaveBeenCalledTimes(1);
});

it('replaces blockers and preserves saved rows after another blocked result', async () => {
	const session = usePromotionBindings();
	const result = blocked({ missingBindings: [credential, variable] });
	session.start(result);
	await session.createBinding(promotionBindingKey(credential), async () => savedCredential);
	await session.createBinding(promotionBindingKey(variable), async () => ({
		kind: 'variable',
		id: 'var-id',
		name: variable.name,
		scope: variable.scope,
	}));
	const next = blocked({
		accessRequirements: [{ ...credential, sourceId: 'other-credential', code: 'access-required' }],
		warnings: applied.warnings,
	});
	vi.mocked(continueApplyPackage).mockResolvedValue(next);
	await session.continueApply();
	expect(session.preflight.value).toBe(next.preflight);
	expect(session.originalResult.value).toBe(result);
	expect(session.unresolvedCount.value).toBe(2);
	const rows = session.groups.value[0].workflows[0].rows;
	expect(rows.find((row) => row.binding.kind === 'credential')?.status).toBe('missing');
	expect(rows.find((row) => row.binding.kind === 'variable')?.status).toBe('resolved');
	expect(session.savedResources.value).toHaveLength(2);
	expect(session.canContinue.value).toBe(false);
});

it('stops after a source change without retrying', async () => {
	const session = usePromotionBindings();
	const initial = blocked({ missingBindings: [] });
	session.start(initial);
	const changed = {
		...initial,
		status: 'source-changed' as const,
		git: { branchName: 'main', commitSha: 'b'.repeat(40) },
	};
	vi.mocked(continueApplyPackage).mockResolvedValue(changed);
	expect(await session.continueApply()).toBe(changed);
	expect(session.sourceChanged.value).toBe(true);
	expect(session.originalResult.value).toBe(initial);
	await session.continueApply();
	expect(continueApplyPackage).toHaveBeenCalledTimes(1);
});

it.each([new Error('Offline'), new ResponseError('Forbidden', { httpStatusCode: 403 })])(
	'keeps saved items after a request fails: %s',
	async (error) => {
		const session = usePromotionBindings();
		session.start(blocked());
		await session.createBinding(promotionBindingKey(credential), async () => savedCredential);
		vi.mocked(continueApplyPackage).mockRejectedValue(error);
		await session.continueApply();
		expect(session.error.value).toBe('continue');
		expect(session.savedResources.value).toEqual([savedCredential]);
		expect(session.canContinue.value).toBe(true);
		expect(continueApplyPackage).toHaveBeenCalledTimes(1);
	},
);

it('ignores an editor result from a closed session', async () => {
	const pending = createDeferredPromise<CreatedPromotionBinding | null>();
	const session = usePromotionBindings();
	session.start(blocked());
	const creating = session.createBinding(
		promotionBindingKey(credential),
		async () => await pending.promise,
	);
	session.end();
	session.start(blocked());
	pending.resolve(savedCredential);
	await creating;
	expect(session.savedResources.value).toEqual([]);
	expect(session.unresolvedCount.value).toBe(1);
});
