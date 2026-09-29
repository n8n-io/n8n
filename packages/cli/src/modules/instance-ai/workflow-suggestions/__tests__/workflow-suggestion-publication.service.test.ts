import type { WorkflowSuggestionAppliedVersion, WorkflowPublicationStatus } from '@n8n/api-types';
import {
	WorkflowEntity,
	type User,
	type UserRepository,
	type WorkflowPublicationOutbox,
	type WorkflowPublicationOutboxRepository,
	type WorkflowPublicationRetryState,
	type WorkflowPublicationRetryStateRepository,
} from '@n8n/db';
import { ConflictError, ForbiddenError } from '@n8n/errors';
import { calculateWorkflowChecksum } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';
import type { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import type { WorkflowSuggestionRepository } from '../database/workflow-suggestion.repository';
import { WorkflowSuggestionPublicationService } from '../workflow-suggestion-publication.service';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

const suggestions = mock<WorkflowSuggestionRepository>();
const users = mock<UserRepository>();
const publication = mock<WorkflowPublicationStatusService>();
const outbox = mock<WorkflowPublicationOutboxRepository>();
const workflows = mock<WorkflowService>();
const retryState = mock<WorkflowPublicationRetryStateRepository>();
const service = new WorkflowSuggestionPublicationService(
	suggestions,
	users,
	publication,
	outbox,
	workflows,
	retryState,
);
const user = mock<User>({ id: 'user', disabled: false });
let workflow: WorkflowEntity;
let applied: WorkflowSuggestionAppliedVersion;

function status(
	value: WorkflowPublicationStatus['status'],
	liveVersionId: string | null,
	pendingVersionId: string | null = null,
): WorkflowPublicationStatus {
	return { status: value, liveVersionId, pendingVersionId, triggers: [] };
}

beforeEach(async () => {
	vi.resetAllMocks();
	workflow = Object.assign(new WorkflowEntity(), {
		id: 'workflow',
		name: 'Example',
		nodes: [],
		connections: {},
		versionId: 'saved',
		activeVersionId: 'baseline',
		isArchived: false,
	});
	applied = {
		projectId: 'project',
		baselinePublicationId: null,
		versionId: 'saved',
		previousPublishedVersionId: 'baseline',
		checksum: await calculateWorkflowChecksum(workflow),
		action: 'approve-and-publish',
		actorId: user.id,
	};
	users.findByIdWithRole.mockResolvedValue(user);
	vi.mocked(userHasScopes).mockResolvedValue(true);
	suggestions.readWorkflowTarget.mockResolvedValue({
		workflow,
		projectId: 'project',
		publicationId: null,
	});
	publication.getStatus.mockResolvedValue(status('published', 'baseline'));
	outbox.findLatestForVersion.mockResolvedValue(null);
	outbox.hasPublicationChangedSince.mockResolvedValue(false);
	retryState.findOneBy.mockResolvedValue(null);
});

describe('reconcile', () => {
	it('confirms an unchanged live baseline without a publication request', async () => {
		expect(await service.reconcile(workflow.id, applied)).toEqual({ status: 'unpublished' });
		expect(workflows.activateWorkflow).not.toHaveBeenCalled();
	});

	it('does not infer success from the requested active version alone', async () => {
		workflow.activeVersionId = applied.versionId;
		expect(await service.reconcile(workflow.id, applied)).toEqual({ status: 'unknown' });
	});

	it.each(['published', 'partial'] as const)('returns a confirmed %s result', async (result) => {
		workflow.activeVersionId = applied.versionId;
		publication.getStatus.mockResolvedValue(status(result, applied.versionId));
		expect(await service.reconcile(workflow.id, applied)).toEqual({ status: result });
	});

	it('identifies a failed exact-version attempt while the baseline remains live', async () => {
		workflow.activeVersionId = applied.versionId;
		outbox.findLatestForVersion.mockResolvedValue(
			mock<WorkflowPublicationOutbox>({ status: 'failed', errorMessage: 'Registration failed' }),
		);
		expect(await service.reconcile(workflow.id, applied)).toEqual({
			status: 'failed',
			message: 'Registration failed',
		});
	});

	it.each([null, 'baseline'])(
		'retains a failure after outbox cleanup when %s is live',
		async (live) => {
			workflow.activeVersionId = applied.versionId;
			publication.getStatus.mockResolvedValue(status(live ? 'published' : 'not_published', live));
			retryState.findOneBy.mockResolvedValue(
				mock<WorkflowPublicationRetryState>({
					workflowId: workflow.id,
					targetVersionId: applied.versionId,
				}),
			);
			expect(await service.reconcile(workflow.id, applied)).toEqual({ status: 'failed' });
			expect(retryState.findOneBy).toHaveBeenCalledExactlyOnceWith({
				workflowId: workflow.id,
				targetVersionId: applied.versionId,
			});
		},
	);

	it('checks a pending publication before retained failure state', async () => {
		workflow.activeVersionId = applied.versionId;
		publication.getStatus.mockResolvedValue(status('in_progress', 'baseline', applied.versionId));
		expect(await service.reconcile(workflow.id, applied)).toEqual({ status: 'in_progress' });
		expect(retryState.findOneBy).not.toHaveBeenCalled();
	});

	it('does not report a failed attempt as unpublished while another version is being published', async () => {
		outbox.findLatestForVersion.mockResolvedValue(
			mock<WorkflowPublicationOutbox>({ status: 'failed' }),
		);
		publication.getStatus.mockResolvedValue(status('in_progress', 'baseline', 'other'));
		expect(await service.reconcile(workflow.id, applied)).toEqual({ status: 'unknown' });
	});

	it('keeps an unavailable publication result unknown', async () => {
		publication.getStatus.mockRejectedValue(new Error('Database unavailable'));
		expect(await service.reconcile(workflow.id, applied)).toEqual({ status: 'unknown' });
	});

	it('does not call a restored baseline unpublished after a later publication', async () => {
		outbox.hasPublicationChangedSince.mockResolvedValue(true);
		expect(await service.reconcile(workflow.id, applied)).toEqual({ status: 'unknown' });
	});
});

describe('publish', () => {
	it('publishes only the saved version with current identity guards', async () => {
		workflows.activateWorkflow.mockImplementation(async () => {
			workflow.activeVersionId = applied.versionId;
			publication.getStatus.mockResolvedValue(status('in_progress', 'baseline', applied.versionId));
			return workflow;
		});
		expect(await service.publish(user, workflow.id, applied)).toEqual({ status: 'in_progress' });
		expect(workflows.activateWorkflow).toHaveBeenCalledExactlyOnceWith(user, workflow.id, {
			versionId: applied.versionId,
			expectedChecksum: applied.checksum,
			expectedVersions: {
				savedVersionId: applied.versionId,
				activeVersionId: 'baseline',
				projectId: 'project',
				baselinePublicationId: null,
			},
		});
	});

	it.each(['in_progress', 'partial', 'published', 'unknown'] as const)(
		'does not repeat publication for a %s result',
		async (result) => {
			workflow.activeVersionId = applied.versionId;
			publication.getStatus.mockResolvedValue(
				result === 'unknown'
					? status('published', 'baseline')
					: status(result, applied.versionId, result === 'in_progress' ? applied.versionId : null),
			);
			expect(await service.publish(user, workflow.id, applied)).toEqual({ status: result });
			expect(workflows.activateWorkflow).not.toHaveBeenCalled();
		},
	);

	it.each(['in_progress', 'partial', 'published'] as const)(
		'reconciles a lost response to %s',
		async (result) => {
			workflows.activateWorkflow.mockImplementation(async () => {
				workflow.activeVersionId = applied.versionId;
				publication.getStatus.mockResolvedValue(
					status(result, applied.versionId, result === 'in_progress' ? applied.versionId : null),
				);
				throw new Error('Response unavailable');
			});
			expect(await service.publish(user, workflow.id, applied)).toEqual({ status: result });
			expect(workflows.activateWorkflow).toHaveBeenCalledTimes(1);
		},
	);

	it('reports an unknown result when the response and reconciliation fail', async () => {
		workflows.activateWorkflow.mockImplementation(async () => {
			publication.getStatus.mockRejectedValue(new Error('Database unavailable'));
			throw new Error('Response unavailable');
		});
		expect(await service.publish(user, workflow.id, applied)).toEqual({
			status: 'unknown',
			message: 'Response unavailable',
		});
	});

	it('keeps a validation failure unpublished', async () => {
		workflows.activateWorkflow.mockRejectedValue(new Error('Fix the credentials'));
		expect(await service.publish(user, workflow.id, applied)).toEqual({
			status: 'failed',
			message: 'Fix the credentials',
		});
	});

	it('retries a confirmed failed version with a normalized checksum', async () => {
		workflow.activeVersionId = applied.versionId;
		outbox.findLatestForVersion.mockResolvedValue(
			mock<WorkflowPublicationOutbox>({ status: 'failed' }),
		);
		await service.publish(user, workflow.id, applied);
		expect(workflows.activateWorkflow).toHaveBeenCalledExactlyOnceWith(user, workflow.id, {
			versionId: applied.versionId,
			expectedChecksum: await calculateWorkflowChecksum(workflow),
			expectedVersions: {
				savedVersionId: applied.versionId,
				activeVersionId: applied.versionId,
				projectId: 'project',
				baselinePublicationId: null,
			},
		});
	});

	it('retries a retained failure after its diagnostic record was removed', async () => {
		workflow.activeVersionId = applied.versionId;
		retryState.findOneBy.mockResolvedValue(
			mock<WorkflowPublicationRetryState>({
				workflowId: workflow.id,
				targetVersionId: applied.versionId,
			}),
		);
		workflows.activateWorkflow.mockImplementation(async () => {
			publication.getStatus.mockResolvedValue(status('in_progress', 'baseline', applied.versionId));
			return workflow;
		});
		expect(await service.publish(user, workflow.id, applied)).toEqual({ status: 'in_progress' });
		expect(workflows.activateWorkflow).toHaveBeenCalledTimes(1);
		expect(workflows.activateWorkflow).toHaveBeenCalledWith(
			user,
			workflow.id,
			expect.objectContaining({ versionId: applied.versionId }),
		);
	});

	it.each([
		{ versionId: 'later-save' },
		{ activeVersionId: 'other-published' },
		{ name: 'Later metadata change' },
		{ isArchived: true },
	])('rejects workflow drift: %s', async (change) => {
		Object.assign(workflow, change);
		await expect(service.publish(user, workflow.id, applied)).rejects.toBeInstanceOf(ConflictError);
		expect(workflows.activateWorkflow).not.toHaveBeenCalled();
	});

	it('rechecks publish permission before a retry', async () => {
		vi.mocked(userHasScopes).mockResolvedValue(false);
		await expect(service.publish(user, workflow.id, applied)).rejects.toBeInstanceOf(
			ForbiddenError,
		);
		expect(workflows.activateWorkflow).not.toHaveBeenCalled();
	});

	it('rejects a retry after another publication restored the original version', async () => {
		outbox.hasPublicationChangedSince.mockResolvedValue(true);
		await expect(service.publish(user, workflow.id, applied)).rejects.toBeInstanceOf(ConflictError);
		expect(workflows.activateWorkflow).not.toHaveBeenCalled();
	});
});
