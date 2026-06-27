import { mock, type MockProxy } from 'jest-mock-extended';
import { UserError } from 'n8n-workflow';

import type { CodeReviewProvider, PullRequestSummary } from '../code-review-provider';
import type { CodeReviewProviderFactory } from '../code-review-provider.factory';
import { PullRequestReviewService } from '../pull-request-review.service.ee';
import type { SourceControlPreferencesService } from '../../source-control-preferences.service.ee';
import type { SourceControlService } from '../../source-control.service.ee';

describe('PullRequestReviewService', () => {
	const prSummary: PullRequestSummary = {
		provider: 'github',
		prNumber: 7,
		title: 'Add lead flow',
		url: 'https://github.com/acme/flows/pull/7',
		author: 'alice',
		isDraft: false,
		sourceBranch: 'feature',
		targetBranch: 'main',
		baseSha: 'basesha',
		headSha: 'headsha',
		createdAt: '2026-06-01T00:00:00Z',
		updatedAt: '2026-06-02T00:00:00Z',
	};

	const workflowJson = (id: string, name: string) =>
		JSON.stringify({ id, name, nodes: [{ name: 'A' }], connections: {} });

	const setup = (provider: MockProxy<CodeReviewProvider> | null) => {
		const factory = mock<CodeReviewProviderFactory>();
		factory.getProvider.mockResolvedValue(provider);
		const preferences = mock<SourceControlPreferencesService>();
		preferences.getBranchName.mockReturnValue('main');
		const sourceControlService = mock<SourceControlService>();
		if (provider) {
			provider.listPullRequestReviews.mockResolvedValue([]);
		}
		return new PullRequestReviewService(factory, preferences, sourceControlService);
	};

	it('throws a UserError when no provider is available', async () => {
		const service = setup(null);
		await expect(service.listReviews()).rejects.toThrow(UserError);
	});

	it('lists reviews with a count of changed workflow files only', async () => {
		const provider = mock<CodeReviewProvider>();
		provider.listOpenPullRequests.mockResolvedValue([prSummary]);
		provider.listFiles.mockResolvedValue([
			{ path: 'workflows/a.json', status: 'modified' },
			{ path: 'workflows/b.json', status: 'added' },
			{ path: 'README.md', status: 'modified' },
		]);

		const service = setup(provider);
		const reviews = await service.listReviews();

		expect(provider.listOpenPullRequests).toHaveBeenCalledWith('main');
		expect(reviews).toHaveLength(1);
		expect(reviews[0].workflowChangeCount).toBe(2);
	});

	it('assembles base/head snapshots and skips non-workflow files', async () => {
		const provider = mock<CodeReviewProvider>();
		provider.getPullRequest.mockResolvedValue(prSummary);
		provider.listFiles.mockResolvedValue([
			{ path: 'workflows/modified.json', status: 'modified' },
			{ path: 'workflows/added.json', status: 'added' },
			{ path: 'workflows/removed.json', status: 'removed' },
			{ path: 'credential_stubs/x.json', status: 'modified' },
		]);
		provider.getFileAtRef.mockImplementation(async (filePath, ref) => {
			if (filePath === 'workflows/modified.json') {
				return ref === 'basesha' ? workflowJson('m', 'Old') : workflowJson('m', 'New');
			}
			if (filePath === 'workflows/added.json' && ref === 'headsha') {
				return workflowJson('a', 'Added');
			}
			if (filePath === 'workflows/removed.json' && ref === 'basesha') {
				return workflowJson('r', 'Removed');
			}
			return null;
		});

		const service = setup(provider);
		const detail = await service.getReview(7);

		expect(detail.workflows).toHaveLength(3); // credential stub excluded

		const modified = detail.workflows.find((w) => w.path === 'workflows/modified.json');
		expect(modified?.baseWorkflow?.name).toBe('Old');
		expect(modified?.headWorkflow?.name).toBe('New');
		expect(modified?.name).toBe('New'); // head name preferred

		const added = detail.workflows.find((w) => w.path === 'workflows/added.json');
		expect(added?.baseWorkflow).toBeNull();
		expect(added?.headWorkflow?.name).toBe('Added');

		const removed = detail.workflows.find((w) => w.path === 'workflows/removed.json');
		expect(removed?.baseWorkflow?.name).toBe('Removed');
		expect(removed?.headWorkflow).toBeNull();

		// Added files must not be fetched at the base ref, removed files not at head.
		expect(provider.getFileAtRef).not.toHaveBeenCalledWith('workflows/added.json', 'basesha');
		expect(provider.getFileAtRef).not.toHaveBeenCalledWith('workflows/removed.json', 'headsha');
	});
});
