import { ref } from 'vue';
import { ResponseError } from '@n8n/rest-api-client/utils';

import type { CredentialsResource } from '@/Interface';

import {
	canUseCredentialBulkMoveDestination,
	formatBulkCredentialActionError,
	useBulkCredentialActions,
} from './useBulkCredentialActions';
import * as api from './bulkCredentialActions.api';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('./bulkCredentialActions.api', async (importOriginal) => ({
	...(await importOriginal()),
	bulkDeleteCredentialsApi: vi.fn(),
	bulkTransferCredentialsApi: vi.fn(),
}));

const credential = (
	id: string,
	scopes: CredentialsResource['scopes'],
	overrides: Partial<CredentialsResource> = {},
): CredentialsResource =>
	({
		resourceType: 'credential',
		id,
		name: `Credential ${id}`,
		createdAt: '',
		updatedAt: '',
		type: 'testApi',
		readOnly: false,
		needsSetup: false,
		scopes,
		...overrides,
	}) as CredentialsResource;

describe('useBulkCredentialActions', () => {
	it('offers Move and Delete when every selected credential has permission', () => {
		const selectedItems = ref([
			credential('1', ['credential:move', 'credential:delete']),
			credential('2', ['credential:move', 'credential:delete']),
		]);
		const actions = useBulkCredentialActions({
			selectedItems,
			teamProjectsEnabled: ref(true),
		});

		expect(actions.availableActions.value.map(({ id }) => id)).toEqual(['move', 'delete']);
	});

	it('only offers actions shared by the full selection', () => {
		const selectedItems = ref([
			credential('1', ['credential:move', 'credential:delete']),
			credential('2', ['credential:delete']),
		]);
		const actions = useBulkCredentialActions({
			selectedItems,
			teamProjectsEnabled: ref(true),
		});

		expect(actions.availableActions.value.map(({ id }) => id)).toEqual(['delete']);
	});

	it('requires createEndUser to delete a resolvable credential', () => {
		const selectedItems = ref([credential('1', ['credential:delete'], { isResolvable: true })]);
		const actions = useBulkCredentialActions({
			selectedItems,
			teamProjectsEnabled: ref(true),
		});

		expect(actions.availableActions.value).toEqual([]);
		selectedItems.value = [
			credential('1', ['credential:delete', 'credential:createEndUser'], {
				isResolvable: true,
			}),
		];
		expect(actions.availableActions.value.map(({ id }) => id)).toEqual(['delete']);
	});

	it('hides Move when team projects are disabled', () => {
		const actions = useBulkCredentialActions({
			selectedItems: ref([credential('1', ['credential:move'])]),
			teamProjectsEnabled: ref(false),
		});

		expect(actions.availableActions.value).toEqual([]);
	});

	it('executes Delete with every selected credential ID', async () => {
		const selectedItems = ref([
			credential('1', ['credential:delete']),
			credential('2', ['credential:delete']),
		]);
		vi.mocked(api.bulkDeleteCredentialsApi).mockResolvedValue({
			status: 'completed',
			results: [
				{ credentialId: '1', status: 'completed' },
				{ credentialId: '2', status: 'completed' },
			],
		});
		const actions = useBulkCredentialActions({
			selectedItems,
			teamProjectsEnabled: ref(true),
		});
		actions.openAction('delete');

		const result = await actions.execute();

		expect(api.bulkDeleteCredentialsApi).toHaveBeenCalledWith({}, ['1', '2']);
		expect(result.items.map(({ name }) => name)).toEqual(['Credential 1', 'Credential 2']);
	});

	it('executes Move with one destination for every selected credential', async () => {
		const selectedItems = ref([
			credential('1', ['credential:move']),
			credential('2', ['credential:move']),
		]);
		vi.mocked(api.bulkTransferCredentialsApi).mockResolvedValue({
			status: 'completed',
			results: [],
		});
		const actions = useBulkCredentialActions({
			selectedItems,
			teamProjectsEnabled: ref(true),
		});
		actions.openAction('move');

		await actions.execute({ destinationProjectId: 'project-3' });

		expect(api.bulkTransferCredentialsApi).toHaveBeenCalledWith(
			{},
			{
				credentialIds: ['1', '2'],
				destinationProjectId: 'project-3',
			},
		);
	});
});

describe('formatBulkCredentialActionError', () => {
	it('maps typed preflight issues to credential names', () => {
		const credentials = [credential('1', ['credential:delete'])];
		const error = new ResponseError('Preflight failed', {
			meta: {
				issues: [
					{
						credentialId: '1',
						reason: 'notFoundOrForbidden',
						message: 'Credential does not exist or is not accessible.',
					},
				],
			},
		});

		expect(formatBulkCredentialActionError(error, credentials, 'Try again.')).toEqual({
			message: 'Try again.',
			details: ['Credential 1: Credential does not exist or is not accessible.'],
		});
	});
});

describe('canUseCredentialBulkMoveDestination', () => {
	const project = (id: string, scopes?: string[]) =>
		({ id, scopes }) as Parameters<typeof canUseCredentialBulkMoveDestination>[0];
	const homeProject = (id: string) => ({
		id,
		name: `Project ${id}`,
		type: 'team' as const,
		icon: null,
		createdAt: '',
		updatedAt: '',
	});

	it('excludes every selected credential owner project', () => {
		const credentials = [
			credential('1', ['credential:move'], { homeProject: homeProject('source-1') }),
			credential('2', ['credential:move'], { homeProject: homeProject('source-2') }),
		];

		expect(canUseCredentialBulkMoveDestination(project('source-1'), credentials)).toBe(false);
		expect(canUseCredentialBulkMoveDestination(project('source-2'), credentials)).toBe(false);
		expect(canUseCredentialBulkMoveDestination(project('destination'), credentials)).toBe(true);
	});

	it('requires credential creation scopes when destination scopes are available', () => {
		const regular = [credential('1', ['credential:move'])];
		const resolvable = [credential('1', ['credential:move'], { isResolvable: true })];

		expect(canUseCredentialBulkMoveDestination(project('target', []), regular)).toBe(false);
		expect(
			canUseCredentialBulkMoveDestination(project('target', ['credential:create']), regular),
		).toBe(true);
		expect(
			canUseCredentialBulkMoveDestination(project('target', ['credential:create']), resolvable),
		).toBe(false);
		expect(
			canUseCredentialBulkMoveDestination(
				project('target', ['credential:create', 'credential:createEndUser']),
				resolvable,
			),
		).toBe(true);
	});
});
