import type { PromotionDirection, PromotionPreview } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { ref } from 'vue';

import { applied } from '../__tests__/bindings.fixtures';
import type { ApplyCheckResult } from '../promotions.types';
import { applyProjectSelection, continueApplyProjectSelection } from '../promotions.api';
import { usePromotionOperation, type OperationRequest } from './usePromotionOperation';

const confirm = vi.hoisted(() => vi.fn());
const confirmUnresolved = vi.fn<() => Promise<boolean>>();

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ publicApiContext: { baseUrl: '/custom/api/v1' } }),
}));
vi.mock('vue-router', () => ({
	useRouter: () => ({ currentRoute: { value: { name: 'other' } }, replace: vi.fn() }),
}));
vi.mock('@n8n/design-system', async () => ({
	...(await vi.importActual<object>('@n8n/design-system')),
	useMessage: () => ({ confirm }),
}));
const showApplied = vi.hoisted(() => vi.fn());
vi.mock('./usePromotionOutcome', () => ({
	usePromotionOutcome: () => ({
		showPromoted: vi.fn(),
		showApplied,
		announceApplied: vi.fn(),
	}),
}));
vi.mock('../promotions.api');

const check = {
	environmentId: 'env-1',
	git: { branchName: 'main', commitSha: 'a'.repeat(40) },
} as ApplyCheckResult;

function setup() {
	const refresh = vi.fn(async () => {});
	const operation = usePromotionOperation(ref('project-1'), ref<PromotionDirection>('apply'), {
		preview: ref<PromotionPreview | null>(null),
		check: ref<ApplyCheckResult | null>(check),
		refresh,
		confirmUnresolved,
	});
	return { operation, refresh };
}

const request = (fields: Partial<OperationRequest> = {}): OperationRequest => ({
	workflowIds: ['wf-1'],
	folderIds: [],
	credentialIds: [],
	confirmDestructiveChanges: false,
	confirmMissingDependencies: false,
	...fields,
});

const expected = {
	workflowIds: ['wf-1'],
	folderIds: [],
	expectedSource: { environmentId: 'env-1', ...check.git },
	expectedPreviewRevision: undefined,
};

beforeEach(() => {
	vi.resetAllMocks();
	confirm.mockResolvedValue('confirm');
	confirmUnresolved.mockResolvedValue(true);
});

it.each([
	{ status: 423, kind: 'rejected', refreshes: false },
	{ status: 409, kind: 'conflict', refreshes: true },
	{ status: 503, kind: 'uncertain', refreshes: true },
])('reads a $status response as $kind', async ({ status, kind, refreshes }) => {
	const message = 'The server refused the request.';
	vi.mocked(applyProjectSelection).mockRejectedValue(
		new ResponseError(message, { httpStatusCode: status }),
	);
	const { operation, refresh } = setup();

	await operation.submit(request());

	expect(operation.error.value).toEqual({
		message:
			status === 423
				? 'Nothing was applied. Another operation is running on this environment. Try again when it finishes.'
				: message,
		kind,
	});
	expect(refresh).toHaveBeenCalledTimes(refreshes ? 1 : 0);
});

describe('the questions of an Apply', () => {
	it('asks the generic question and starts the Apply when nothing stays unresolved', async () => {
		vi.mocked(applyProjectSelection).mockResolvedValue(applied);
		const { operation } = setup();

		await operation.submit(request());

		expect(confirmUnresolved).not.toHaveBeenCalled();
		expect(confirm).toHaveBeenCalledTimes(1);
		expect(applyProjectSelection).toHaveBeenCalledWith(expect.anything(), 'project-1', expected);
		expect(continueApplyProjectSelection).not.toHaveBeenCalled();
	});

	it('asks only about the unresolved dependencies, then continues the Apply with the confirmation', async () => {
		vi.mocked(continueApplyProjectSelection).mockResolvedValue(applied);
		const { operation } = setup();

		await operation.submit(request({ confirmMissingDependencies: true }));

		expect(confirmUnresolved).toHaveBeenCalledTimes(1);
		expect(confirm).not.toHaveBeenCalled();
		expect(applyProjectSelection).not.toHaveBeenCalled();
		expect(continueApplyProjectSelection).toHaveBeenCalledWith(expect.anything(), 'project-1', {
			...expected,
			confirmMissingDependencies: true,
		});
	});

	it('asks about the unresolved dependencies before the data table changes, and sends both confirmations', async () => {
		vi.mocked(continueApplyProjectSelection).mockResolvedValue(applied);
		const { operation } = setup();

		await operation.submit(
			request({ confirmDestructiveChanges: true, confirmMissingDependencies: true }),
		);

		expect(confirm).toHaveBeenCalledTimes(1);
		expect(confirmUnresolved.mock.invocationCallOrder[0]).toBeLessThan(
			confirm.mock.invocationCallOrder[0],
		);
		expect(continueApplyProjectSelection).toHaveBeenCalledWith(expect.anything(), 'project-1', {
			...expected,
			confirmDestructiveChanges: true,
			confirmMissingDependencies: true,
		});
	});

	it('applies nothing and asks no other question when the user does not accept the unresolved dependencies', async () => {
		confirmUnresolved.mockResolvedValue(false);
		const { operation, refresh } = setup();

		await operation.submit(
			request({ confirmDestructiveChanges: true, confirmMissingDependencies: true }),
		);

		expect(confirm).not.toHaveBeenCalled();
		expect(applyProjectSelection).not.toHaveBeenCalled();
		expect(continueApplyProjectSelection).not.toHaveBeenCalled();
		expect(refresh).not.toHaveBeenCalled();
		expect(operation.isBusy.value).toBe(false);
	});

	it.each(['blocked', 'preview-changed'] as const)(
		'reports no success and reloads the preview when the confirmed Apply answers %s',
		async (status) => {
			const identity = { environmentId: 'env-1', git: check.git };
			vi.mocked(continueApplyProjectSelection).mockResolvedValue(
				status === 'blocked'
					? {
							...identity,
							status,
							check: {
								missingProjects: [],
								missingBindings: [],
								accessRequirements: [],
								conflicts: [],
								warnings: [],
								missingDependencies: [],
							},
						}
					: { ...identity, status },
			);
			const { operation, refresh } = setup();

			await operation.submit(request({ confirmMissingDependencies: true }));

			expect(operation.notice.value).toBe(status === 'blocked' ? 'newBlockers' : 'instanceChanged');
			expect(showApplied).not.toHaveBeenCalled();
			expect(refresh).toHaveBeenCalledTimes(1);
		},
	);
});
