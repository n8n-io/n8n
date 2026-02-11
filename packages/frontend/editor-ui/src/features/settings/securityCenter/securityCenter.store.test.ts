import { createPinia, setActivePinia } from 'pinia';
import { useSecurityAuditStore } from './securityCenter.store';
import type { SecurityAuditResponse } from './securityCenter.api';

const { runSecurityAudit } = vi.hoisted(() => ({
	runSecurityAudit: vi.fn(),
}));

vi.mock('./securityCenter.api', () => ({
	runSecurityAudit,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: {
			baseUrl: 'http://localhost:5678',
			pushRef: 'test-push-ref',
		},
	})),
}));

const mockAuditResponse: SecurityAuditResponse = {
	'Credentials Risk Report': {
		risk: 'credentials',
		sections: [
			{
				title: 'Unused credentials',
				description: 'Credentials not used in any workflow',
				recommendation: 'Consider deleting unused credentials',
				location: [
					{ kind: 'credential', id: 'cred-1', name: 'Test Credential' },
					{ kind: 'credential', id: 'cred-2', name: 'Another Credential' },
				],
			},
		],
	},
	'Nodes Risk Report': {
		risk: 'nodes',
		sections: [
			{
				title: 'Official risky nodes',
				description: 'Nodes that can execute arbitrary code',
				recommendation: 'Review node parameters',
				location: [
					{
						kind: 'node',
						workflowId: 'wf-1',
						workflowName: 'Test Workflow',
						nodeId: 'node-1',
						nodeName: 'Code',
						nodeType: 'n8n-nodes-base.code',
					},
				],
			},
			{
				title: 'Community nodes',
				description: 'Nodes from community',
				recommendation: 'Review source code',
				location: [
					{
						kind: 'community',
						nodeType: 'n8n-nodes-test',
						packageUrl: 'https://npmjs.com/n8n-nodes-test',
					},
				],
			},
		],
	},
};

const emptyAuditResponse: SecurityAuditResponse = [];

describe('securityAudit.store', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		setActivePinia(createPinia());
	});

	describe('initial state', () => {
		it('should have correct initial state', () => {
			const store = useSecurityAuditStore();

			expect(store.auditResult).toBeNull();
			expect(store.isLoading).toBe(false);
			expect(store.lastRunAt).toBeNull();
			expect(store.error).toBeNull();
		});

		it('should have no results initially', () => {
			const store = useSecurityAuditStore();

			expect(store.hasResults).toBe(false);
			expect(store.isEmptyResult).toBe(false);
			expect(store.reports).toEqual([]);
			expect(store.totalIssueCount).toBe(0);
		});
	});

	describe('runAudit', () => {
		it('should set loading state during audit', async () => {
			const store = useSecurityAuditStore();
			runSecurityAudit.mockImplementation(
				async () =>
					await new Promise((resolve) => setTimeout(() => resolve(mockAuditResponse), 100)),
			);

			const auditPromise = store.runAudit();
			expect(store.isLoading).toBe(true);

			await auditPromise;
			expect(store.isLoading).toBe(false);
		});

		it('should store audit results on success', async () => {
			const store = useSecurityAuditStore();
			runSecurityAudit.mockResolvedValue(mockAuditResponse);

			await store.runAudit();

			expect(store.auditResult).toEqual(mockAuditResponse);
			expect(store.lastRunAt).toBeInstanceOf(Date);
			expect(store.error).toBeNull();
		});

		it('should store error on failure', async () => {
			const store = useSecurityAuditStore();
			const testError = new Error('Audit failed');
			runSecurityAudit.mockRejectedValue(testError);

			await expect(store.runAudit()).rejects.toThrow('Audit failed');

			expect(store.error).toEqual(testError);
			expect(store.isLoading).toBe(false);
		});

		it('should convert non-Error to Error on failure', async () => {
			const store = useSecurityAuditStore();
			runSecurityAudit.mockRejectedValue('String error');

			await expect(store.runAudit()).rejects.toThrow();

			expect(store.error).toBeInstanceOf(Error);
			expect(store.error?.message).toBe('Failed to run security audit');
		});

		it('should pass options to API', async () => {
			const store = useSecurityAuditStore();
			runSecurityAudit.mockResolvedValue(mockAuditResponse);

			await store.runAudit({ categories: ['credentials'], daysAbandonedWorkflow: 30 });

			expect(runSecurityAudit).toHaveBeenCalledWith(expect.anything(), {
				categories: ['credentials'],
				daysAbandonedWorkflow: 30,
			});
		});
	});

	describe('computed properties', () => {
		it('should compute hasResults correctly for non-empty response', async () => {
			const store = useSecurityAuditStore();
			runSecurityAudit.mockResolvedValue(mockAuditResponse);

			await store.runAudit();

			expect(store.hasResults).toBe(true);
			expect(store.isEmptyResult).toBe(false);
		});

		it('should compute isEmptyResult correctly for empty array response', async () => {
			const store = useSecurityAuditStore();
			runSecurityAudit.mockResolvedValue(emptyAuditResponse);

			await store.runAudit();

			expect(store.hasResults).toBe(false);
			expect(store.isEmptyResult).toBe(true);
		});

		it('should compute reports from audit result', async () => {
			const store = useSecurityAuditStore();
			runSecurityAudit.mockResolvedValue(mockAuditResponse);

			await store.runAudit();

			expect(store.reports).toHaveLength(2);
			expect(store.reports[0].risk).toBe('credentials');
			expect(store.reports[1].risk).toBe('nodes');
		});

		it('should compute totalIssueCount from sections', async () => {
			const store = useSecurityAuditStore();
			runSecurityAudit.mockResolvedValue(mockAuditResponse);

			await store.runAudit();

			// 1 section in credentials + 2 sections in nodes = 3
			expect(store.totalIssueCount).toBe(3);
		});
	});

	describe('getReportByCategory', () => {
		it('should return report for existing category', async () => {
			const store = useSecurityAuditStore();
			runSecurityAudit.mockResolvedValue(mockAuditResponse);

			await store.runAudit();

			const credentialsReport = store.getReportByCategory('credentials');
			expect(credentialsReport).toBeDefined();
			expect(credentialsReport?.risk).toBe('credentials');
		});

		it('should return undefined for non-existing category', async () => {
			const store = useSecurityAuditStore();
			runSecurityAudit.mockResolvedValue(mockAuditResponse);

			await store.runAudit();

			const databaseReport = store.getReportByCategory('database');
			expect(databaseReport).toBeUndefined();
		});
	});

	describe('reset', () => {
		it('should reset all state', async () => {
			const store = useSecurityAuditStore();
			runSecurityAudit.mockResolvedValue(mockAuditResponse);

			await store.runAudit();
			expect(store.auditResult).not.toBeNull();
			expect(store.lastRunAt).not.toBeNull();

			store.reset();

			expect(store.auditResult).toBeNull();
			expect(store.lastRunAt).toBeNull();
			expect(store.error).toBeNull();
		});
	});
});
