import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import * as breakingChangesApi from '@n8n/rest-api-client/api/breaking-changes';
import { useOwnerPicker } from './useOwnerPicker';
import { owner, rowList, workflowRow } from '../__tests__/workflowRow';

vi.mock('@n8n/rest-api-client/api/breaking-changes', () => ({
	getWorkflowOwnerCandidates: vi.fn(),
	assignWorkflowOwner: vi.fn(),
	unassignWorkflowOwner: vi.fn(),
}));

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError }) }));

const ada = owner('ada', { firstName: 'Ada', lastName: 'Lovelace', source: 'suggested' });
const grace = { id: 'grace', firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com' };
const noEmail = { id: 'noemail', firstName: 'No', lastName: 'Email', email: null };

// A promise that the test resolves later, to answer requests out of order.
function deferred<T>() {
	let resolve: (value: T) => void = () => {};
	const promise = new Promise<T>((done) => (resolve = done));
	return { promise, resolve };
}

function setup() {
	const list = rowList([
		workflowRow({ id: 'workflow-1', owner: ada }),
		workflowRow({ id: 'workflow-2' }),
	]);
	return { ...list, ...useOwnerPicker(list.updateRows) };
}

describe('useOwnerPicker', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should list only the row's owner before the picker is focused", () => {
		const { rows, ownerOptionsFor } = setup();

		expect(ownerOptionsFor(rows.value[0]).map((user) => user.id)).toEqual(['ada']);
		expect(ownerOptionsFor(rows.value[1])).toEqual([]);
	});

	it('should load the candidates with an email for the focused row', async () => {
		vi.mocked(breakingChangesApi.getWorkflowOwnerCandidates).mockResolvedValue([grace, noEmail]);
		const { rows, ownerOptionsFor, onOwnerPickerFocus, isLoadingUsers } = setup();

		onOwnerPickerFocus(rows.value[0]);
		expect(isLoadingUsers.value).toBe(true);
		await vi.waitFor(() => expect(isLoadingUsers.value).toBe(false));

		expect(ownerOptionsFor(rows.value[0])).toEqual([
			expect.objectContaining({ id: 'grace', fullName: 'Grace Hopper' }),
			expect.objectContaining({ id: 'ada', fullName: 'Ada Lovelace' }),
		]);
		expect(ownerOptionsFor(rows.value[1])).toEqual([]);
	});

	it('should keep only the latest candidate list when an older one answers last', async () => {
		const first = deferred<Array<typeof grace>>();
		const second = deferred<Array<typeof grace>>();
		vi.mocked(breakingChangesApi.getWorkflowOwnerCandidates)
			.mockReturnValueOnce(first.promise)
			.mockReturnValueOnce(second.promise);
		const { rows, ownerOptionsFor, onOwnerPickerFocus, isLoadingUsers } = setup();

		onOwnerPickerFocus(rows.value[0]);
		onOwnerPickerFocus(rows.value[1]);
		second.resolve([grace]);
		await vi.waitFor(() => expect(isLoadingUsers.value).toBe(false));
		first.resolve([{ ...grace, id: 'stale' }]);
		await Promise.resolve();

		expect(ownerOptionsFor(rows.value[1]).map((user) => user.id)).toEqual(['grace']);
	});

	it('should show an error when the candidates fail to load', async () => {
		const error = new Error('Failed');
		vi.mocked(breakingChangesApi.getWorkflowOwnerCandidates).mockRejectedValue(error);
		const { rows, onOwnerPickerFocus, isLoadingUsers } = setup();

		onOwnerPickerFocus(rows.value[0]);
		await vi.waitFor(() => expect(isLoadingUsers.value).toBe(false));

		expect(showError).toHaveBeenCalledWith(error, expect.any(String));
	});

	it('should assign the picked user and show the owner that comes back', async () => {
		const assigned = owner('grace', { firstName: 'Grace' });
		vi.mocked(breakingChangesApi.assignWorkflowOwner).mockResolvedValue({ owner: assigned });
		const { rows, onOwnerChange } = setup();

		await onOwnerChange(rows.value[1], 'grace');

		expect(breakingChangesApi.assignWorkflowOwner).toHaveBeenCalledWith(
			expect.anything(),
			'workflow-2',
			'grace',
		);
		expect(rows.value[1].owner).toEqual(assigned);
	});

	it('should clear the assignment and show the suggestion that comes back', async () => {
		const suggestion = owner('grace', { firstName: 'Grace', source: 'suggested' });
		vi.mocked(breakingChangesApi.unassignWorkflowOwner).mockResolvedValue({ owner: suggestion });
		const { rows, onOwnerChange } = setup();

		await onOwnerChange(rows.value[0], '');

		expect(breakingChangesApi.unassignWorkflowOwner).toHaveBeenCalledWith(
			expect.anything(),
			'workflow-1',
		);
		expect(rows.value[0].owner).toEqual(suggestion);
	});

	it('should leave the row without an owner when no suggestion comes back', async () => {
		vi.mocked(breakingChangesApi.unassignWorkflowOwner).mockResolvedValue({ owner: null });
		const { rows, onOwnerChange } = setup();

		await onOwnerChange(rows.value[0], '');

		expect(rows.value[0].owner).toBeUndefined();
	});

	it('should ignore an older owner change that answers last', async () => {
		const first = deferred<{ owner: ReturnType<typeof owner> }>();
		const second = deferred<{ owner: ReturnType<typeof owner> }>();
		vi.mocked(breakingChangesApi.assignWorkflowOwner)
			.mockReturnValueOnce(first.promise)
			.mockReturnValueOnce(second.promise);
		const { rows, onOwnerChange } = setup();

		const firstChange = onOwnerChange(rows.value[1], 'stale');
		const secondChange = onOwnerChange(rows.value[1], 'grace');
		second.resolve({ owner: owner('grace') });
		await secondChange;
		first.resolve({ owner: owner('stale') });
		await firstChange;

		expect(rows.value[1].owner?.id).toBe('grace');
	});
});
