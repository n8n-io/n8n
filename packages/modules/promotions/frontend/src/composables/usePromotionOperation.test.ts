import type { PromotionDirection, PromotionPreview } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { ref } from 'vue';

import type { ApplyCheckResult } from '../promotions.types';
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

function setup() {
	const refresh = vi.fn(async () => {});
	const operation = usePromotionOperation(ref('project-1'), ref<PromotionDirection>('apply'), {
		preview: ref<PromotionPreview | null>(null),
		check: ref<ApplyCheckResult | null>(check),
		refresh,
	});
	return { operation, refresh };
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

	await operation.submit({ workflowIds: ['wf-1'], confirmDestructiveChanges: false });

	expect(operation.error.value).toEqual({ message, kind });
	expect(refresh).toHaveBeenCalledTimes(refreshes ? 1 : 0);
});
