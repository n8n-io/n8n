import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { configure, waitFor } from '@testing-library/vue';
import type { ImportResultDto } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { STORES } from '@n8n/stores';

import { createComponentRenderer } from '@/__tests__/render';
import { importPackage } from '../n8nPackages.api';
import { PACKAGE_IMPORT_MODAL_KEY } from '../n8nPackages.constants';
import PackageImportModal from './PackageImportModal.vue';

vi.mock('../n8nPackages.api', async (importOriginal) => ({
	...(await importOriginal<typeof import('../n8nPackages.api')>()),
	importPackage: vi.fn(),
}));

configure({ testIdAttribute: 'data-testid' });

const importPackageMock = vi.mocked(importPackage);

const dialogPartStub = { template: '<div><slot /></div>' };
const global = {
	stubs: {
		Dialog: { props: ['header'], template: '<div role="dialog"><slot /></div>' },
		DialogHeader: dialogPartStub,
		DialogTitle: dialogPartStub,
		DialogFooter: dialogPartStub,
		DialogDescription: dialogPartStub,
		RouterLink: {
			props: ['to'],
			template: '<a :href="JSON.stringify(to)" @click.prevent><slot /></a>',
		},
	},
};

const publishing = { state: 'published' } as const;

function makeResult(overrides: Partial<ImportResultDto> = {}): ImportResultDto {
	return {
		package: { sourceN8nVersion: '2.0.0', sourceId: 'source', exportedAt: '2026-01-01T00:00:00Z' },
		agents: [
			{
				sourceAgentId: 'agent-1',
				localId: 'agent-1',
				name: 'Support Agent',
				projectId: 'project-1',
				activeVersionId: 'v1',
				status: 'created',
				publishing,
			},
		],
		counts: { agents: { created: 1, updated: 0, skipped: 0 } },
		workflows: [],
		removedWorkflows: [],
		removedFolders: [],
		folders: [],
		projects: [],
		bindings: { agents: {}, workflows: {}, credentials: {} },
		credentials: { matched: [], stubbed: [], seeded: [], incomplete: [], updated: [] },
		dataTables: { matched: 0, created: 0, updated: 0 },
		variables: { matched: [], missing: [], created: [], stubbed: [], updated: [] },
		tags: { matched: [], created: [], renamed: [], reconciled: [], skipped: [] },
		...overrides,
	};
}

const renderModal = createComponentRenderer(PackageImportModal);

function render(data: Partial<InstanceType<typeof PackageImportModal>['data']> = {}) {
	const pinia = createTestingPinia({
		initialState: {
			[STORES.UI]: { modalStateById: { [PACKAGE_IMPORT_MODAL_KEY]: { open: true } } },
		},
	});
	const onImported = vi.fn().mockResolvedValue(undefined);
	const rendered = renderModal({
		props: {
			modalName: PACKAGE_IMPORT_MODAL_KEY,
			data: { projectId: 'project-1', onImported, ...data },
		},
		global,
		pinia,
	});
	return { ...rendered, onImported: data.onImported ?? onImported };
}

async function chooseFileAndImport(getByTestId: (id: string) => HTMLElement) {
	const file = new File(['package'], 'agent.n8np');
	await userEvent.upload(getByTestId('package-import-file-input'), file);
	await userEvent.click(getByTestId('package-import-submit'));
	return file;
}

describe('PackageImportModal', () => {
	beforeEach(() => {
		importPackageMock.mockReset();
	});

	it('disables the import until a file is chosen', () => {
		const { getByTestId } = render();

		expect(getByTestId('package-import-submit')).toBeDisabled();
	});

	it('imports into the project with the new-version policy and calls onImported once', async () => {
		const result = makeResult();
		importPackageMock.mockResolvedValue(result);
		const { getByTestId, onImported } = render();

		const file = await chooseFileAndImport(getByTestId);

		await waitFor(() => expect(getByTestId('package-import-result')).toBeInTheDocument());
		expect(importPackageMock).toHaveBeenCalledWith(expect.anything(), file, {
			projectId: 'project-1',
			conflictPolicy: 'new-version',
		});
		expect(onImported).toHaveBeenCalledTimes(1);
		expect(onImported).toHaveBeenCalledWith(result);
	});

	it('retries only the refresh after a failed refresh', async () => {
		importPackageMock.mockResolvedValue(makeResult());
		const onImported = vi
			.fn()
			.mockRejectedValueOnce(new Error('refresh'))
			.mockResolvedValue(undefined);
		const { getByTestId, queryByTestId } = render({ onImported });

		await chooseFileAndImport(getByTestId);
		await waitFor(() => expect(getByTestId('package-import-refresh-error')).toBeInTheDocument());

		await userEvent.click(getByTestId('package-import-refresh-again'));

		await waitFor(() => expect(queryByTestId('package-import-refresh-error')).toBeNull());
		expect(onImported).toHaveBeenCalledTimes(2);
		expect(importPackageMock).toHaveBeenCalledTimes(1);
	});

	it('lists the blocking issues and imports again on retry', async () => {
		importPackageMock.mockRejectedValueOnce(
			new ResponseError('Import blocked', {
				httpStatusCode: 422,
				meta: {
					issues: [
						{
							type: 'missing-node-type',
							nodeType: 'n8n-nodes-base.foo',
							typeVersion: 1,
							usedBy: [],
						},
					],
				},
			}),
		);
		importPackageMock.mockResolvedValueOnce(makeResult());
		const { getByTestId } = render();

		await chooseFileAndImport(getByTestId);

		await waitFor(() =>
			expect(getByTestId('package-import-blocked')).toHaveTextContent('n8n-nodes-base.foo'),
		);
		await userEvent.click(getByTestId('package-import-retry'));
		await waitFor(() => expect(getByTestId('package-import-result')).toBeInTheDocument());
		expect(importPackageMock).toHaveBeenCalledTimes(2);
	});

	it('shows the error message of a failed request', async () => {
		importPackageMock.mockRejectedValue(new Error('Network Error'));
		const { getByTestId } = render();

		await chooseFileAndImport(getByTestId);

		await waitFor(() =>
			expect(getByTestId('package-import-error')).toHaveTextContent('Network Error'),
		);
	});

	it('shows publication outcomes, the credential warning and Agent links', async () => {
		importPackageMock.mockResolvedValue(
			makeResult({
				agents: [
					{
						sourceAgentId: 'agent-1',
						localId: 'agent-2',
						name: 'Support Agent',
						projectId: 'project-1',
						activeVersionId: null,
						status: 'updated',
						publishing: { state: 'blocked', blockedReason: 'stub-credential' },
					},
				],
				credentials: {
					matched: [],
					stubbed: ['cred-1'],
					seeded: [],
					incomplete: ['cred-2'],
					updated: [],
				},
			}),
		);
		const agentRoute = vi.fn(() => ({ name: 'agent', params: { agentId: 'agent-2' } }));
		const { getByTestId, getByRole } = render({ agentRoute });

		await chooseFileAndImport(getByTestId);

		await waitFor(() => expect(getByTestId('package-import-result')).toBeInTheDocument());
		expect(getByTestId('package-import-publishing')).toHaveTextContent(
			'Not published: A credential needs setup',
		);
		expect(getByTestId('package-import-credentials-warning')).toHaveTextContent(
			'2 imported credentials need setup',
		);
		expect(getByRole('link', { name: 'Support Agent' })).toBeInTheDocument();
		expect(agentRoute).toHaveBeenCalledWith(expect.objectContaining({ localId: 'agent-2' }));
	});
});
