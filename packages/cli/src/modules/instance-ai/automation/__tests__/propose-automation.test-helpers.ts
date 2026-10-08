import type { InstanceWriteAccessService, UrlService } from '@n8n/backend-services';
import { type AiBuilderTemporaryWorkflowRepository, User, type WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import type { WorkflowProvenanceService } from '../../provenance/workflow-provenance.service';
import { AutomationProposalService } from '../automation-proposal.service';
import { AutomationWorkflowKeeper } from '../automation-workflow-keeper';
import { AutomationWorkflowPublisher } from '../automation-workflow-publisher';

export const SCHEDULE = 'n8n-nodes-base.scheduleTrigger';
export const MANUAL = 'n8n-nodes-base.manualTrigger';
export const SLACK = 'n8n-nodes-base.slack';
export const HTTP_REQUEST = 'n8n-nodes-base.httpRequest';

export const BASE_URL = 'http://n8n.local';

/** The thread that built the temporary workflow, as its marker names it. */
export const THREAD_ID = 'thread-1';

/** The saved version that restoring an archived workflow creates. */
export const RESTORED_VERSION_ID = 'v-restored';

export const ALL_SCOPES: Scope[] = [
	'workflow:read',
	'workflow:update',
	'workflow:publish',
	'workflow:delete',
];

export const makeUser = (id: string) => Object.assign(new User(), { id });

/** A workflow as the finder returns it: an AI-temporary schedule workflow in a team project. */
export const storedWorkflow = (overrides: Partial<WorkflowEntity> = {}) =>
	({
		id: 'wf-1',
		name: 'Digest builder',
		nodes: [
			{ name: 'Every weekday', type: SCHEDULE },
			{ name: 'Send digest', type: SLACK },
		],
		versionId: 'v-1',
		activeVersionId: null,
		isArchived: false,
		settings: { availableInMCP: true },
		shared: [{ role: 'workflow:owner', project: { id: 'p-1', name: 'Ops', type: 'team' } }],
		...overrides,
	}) as unknown as WorkflowEntity;

export const manualNodes = [{ name: 'Click', type: MANUAL }] as WorkflowEntity['nodes'];

/**
 * The real proposal service, keeper and publisher on mocked n8n services, registered in the
 * container as the capability loads them. The test file must stub the modules of the mocked
 * services.
 */
export function createAutomationWorld() {
	const finder = mock<WorkflowFinderService>();
	const workflowService = mock<WorkflowService>();
	const temporaryWorkflows = mock<AiBuilderTemporaryWorkflowRepository>();
	const provenance = mock<WorkflowProvenanceService>();
	const writeAccess = mock<InstanceWriteAccessService>();
	const collaborationService = mock<CollaborationService>();
	const urlService = mock<UrlService>();
	const keeper = new AutomationWorkflowKeeper(
		workflowService,
		temporaryWorkflows,
		provenance,
		writeAccess,
	);
	const publisher = new AutomationWorkflowPublisher(workflowService, collaborationService);
	Container.set(
		AutomationProposalService,
		new AutomationProposalService(finder, keeper, publisher, urlService),
	);

	/** Access as stored: the workflow for the scopes that the user holds, null otherwise. */
	const grant = (workflow: WorkflowEntity, scopes: Scope[] = ALL_SCOPES) => {
		finder.findWorkflowForUser.mockImplementation(async (_id, _user, wanted) =>
			wanted.every((scope) => scopes.includes(scope)) ? workflow : null,
		);
	};

	const reset = () => {
		vi.resetAllMocks();
		urlService.getInstanceBaseUrl.mockReturnValue(BASE_URL);
		writeAccess.isReadOnly.mockReturnValue(false);
		temporaryWorkflows.existsForWorkflow.mockResolvedValue(true);
		temporaryWorkflows.findThreadIdForWorkflow.mockResolvedValue(THREAD_ID);
		workflowService.unarchive.mockImplementation(
			async (_user, workflowId) =>
				({ id: workflowId, versionId: RESTORED_VERSION_ID, isArchived: false }) as WorkflowEntity,
		);
		workflowService.activateWorkflow.mockImplementation(
			async (_user, workflowId, options) =>
				({ id: workflowId, activeVersionId: options?.versionId ?? null }) as WorkflowEntity,
		);
		collaborationService.ensureWorkflowEditable.mockResolvedValue(undefined);
		collaborationService.broadcastWorkflowUpdate.mockResolvedValue(undefined);
		grant(storedWorkflow());
	};

	/** True when no step changed the workflow. */
	const nothingChanged = () =>
		workflowService.unarchive.mock.calls.length === 0 &&
		provenance.record.mock.calls.length === 0 &&
		temporaryWorkflows.unmark.mock.calls.length === 0 &&
		workflowService.activateWorkflow.mock.calls.length === 0;

	return {
		finder,
		workflowService,
		temporaryWorkflows,
		provenance,
		writeAccess,
		collaborationService,
		grant,
		reset,
		nothingChanged,
	};
}
