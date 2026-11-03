import type { AppBinding, AppBindingsResponse, AppResponse } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import { ResponseError } from '@n8n/rest-api-client';
import { defineComponent } from 'vue';

import { getAppBindings, setAppBindings } from '../apps.api';
import { useAppBindings } from './useAppBindings';

vi.mock('../apps.api');

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));

const app = {
	id: 'app-1',
	projectId: 'project-1',
	draftVersionId: 'v1',
} as AppResponse;

const workflow = { key: 'submit', kind: 'workflow', workflowId: 'w1' } satisfies AppBinding;
const table = {
	key: 'tasks',
	kind: 'dataTable',
	dataTableId: 't1',
	permissions: ['read'],
} satisfies AppBinding;

const response = (versionId: string, bindings: AppBindingsResponse['bindings']) => ({
	versionId,
	bindings,
	warnings: [],
});

let bindings: ReturnType<typeof useAppBindings>;

const renderComposable = createComponentRenderer(
	defineComponent({
		setup() {
			bindings = useAppBindings(app);
			return () => null;
		},
	}),
);

describe('useAppBindings', () => {
	afterEach(() => vi.clearAllMocks());

	it('saves on the latest version and passes the saved bindings to the next save', async () => {
		vi.mocked(setAppBindings)
			.mockResolvedValueOnce(
				response('v2', [{ ...workflow, name: 'Submit', published: true, input: {}, output: {} }]),
			)
			.mockResolvedValueOnce(response('v3', []));
		renderComposable();

		await Promise.all([
			bindings.save((current) => [...current, workflow]),
			bindings.save((current) => [...current, table]),
		]);

		expect(setAppBindings).toHaveBeenNthCalledWith(
			1,
			expect.anything(),
			'project-1',
			'app-1',
			'v1',
			[workflow],
		);
		expect(setAppBindings).toHaveBeenNthCalledWith(
			2,
			expect.anything(),
			'project-1',
			'app-1',
			'v2',
			[workflow, table],
		);
	});

	it('shows an error and reloads the bindings when the draft changed', async () => {
		vi.mocked(setAppBindings).mockRejectedValue(
			new ResponseError('The app draft changed.', { httpStatusCode: 409 }),
		);
		vi.mocked(getAppBindings).mockResolvedValue(response('v5', []));
		renderComposable();

		expect(await bindings.save((current) => [...current, workflow])).toBeUndefined();

		expect(showError).toHaveBeenCalledOnce();
		expect(getAppBindings).toHaveBeenCalledWith(expect.anything(), 'project-1', 'app-1');
	});
});
