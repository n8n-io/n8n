import type { PromotionDirection, PromotionPreview } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { ref } from 'vue';

import { outsideAccess } from '../__tests__/unresolved.fixtures';
import type { ApplyCheckResult, PromotionOutsideAccessDependency } from '../promotions.types';
import { applyProjectSelection } from '../promotions.api';
import { usePromotionOperation } from './usePromotionOperation';

const confirm = vi.hoisted(() => vi.fn());

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
vi.mock('./usePromotionOutcome', () => ({
	usePromotionOutcome: () => ({
		showPromoted: vi.fn(),
		showApplied: vi.fn(),
		announceApplied: vi.fn(),
	}),
}));
vi.mock('../promotions.api');

const check = {
	environmentId: 'env-1',
	git: { branchName: 'main', commitSha: 'a'.repeat(40) },
} as ApplyCheckResult;

function setup(
	unresolved?: PromotionOutsideAccessDependency[],
	confirmUnresolved = vi.fn(async () => true),
) {
	const refresh = vi.fn(async () => {});
	const operation = usePromotionOperation(ref('project-1'), ref<PromotionDirection>('apply'), {
		preview: ref<PromotionPreview | null>(null),
		check: ref<ApplyCheckResult | null>(check),
		refresh,
		...(unresolved ? { unresolved: ref(unresolved), confirmUnresolved } : {}),
	});
	return { operation, refresh, confirmUnresolved };
}

beforeEach(() => {
	vi.resetAllMocks();
	confirm.mockResolvedValue('confirm');
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

	await operation.submit({
		workflowIds: ['wf-1'],
		folderIds: [],
		credentialIds: [],
		confirmDestructiveChanges: false,
	});

	expect(operation.error.value).toEqual({
		message:
			status === 423
				? 'Nothing was applied. Another operation is running on this environment. Try again when it finishes.'
				: message,
		kind,
	});
	expect(refresh).toHaveBeenCalledTimes(refreshes ? 1 : 0);
});

describe('unresolved dependencies', () => {
	const request = {
		workflowIds: ['wf-1'],
		folderIds: [],
		credentialIds: [],
		confirmDestructiveChanges: false,
	};

	beforeEach(() => {
		vi.mocked(applyProjectSelection).mockResolvedValue({
			status: 'source-changed',
			environmentId: 'env-1',
			git: check.git,
		});
	});

	it('should ask the unresolved question in place of the generic one', async () => {
		const { operation, confirmUnresolved } = setup(outsideAccess);

		await operation.submit(request);

		expect(confirmUnresolved).toHaveBeenCalledTimes(1);
		expect(confirm).not.toHaveBeenCalled();
		expect(applyProjectSelection).toHaveBeenCalledTimes(1);
	});

	it('should apply nothing when the user declines', async () => {
		const { operation } = setup(
			outsideAccess,
			vi.fn(async () => false),
		);

		await operation.submit(request);

		expect(applyProjectSelection).not.toHaveBeenCalled();
	});

	it('should keep the generic question when nothing is left out', async () => {
		const { operation, confirmUnresolved } = setup([]);

		await operation.submit(request);

		expect(confirmUnresolved).not.toHaveBeenCalled();
		expect(confirm).toHaveBeenCalledTimes(1);
	});

	it('should ask both questions when the Apply also changes data tables', async () => {
		const { operation, confirmUnresolved } = setup(outsideAccess);

		await operation.submit({ ...request, confirmDestructiveChanges: true });

		expect(confirmUnresolved).toHaveBeenCalledTimes(1);
		expect(confirm).toHaveBeenCalledTimes(1);
	});
});
