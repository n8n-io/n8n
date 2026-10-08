import type { ChatPayload } from '@n8n/ai-workflow-builder';
import type { Logger } from '@n8n/backend-common';
import type { ProjectRepository, SharedWorkflowRepository, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';
import { userHasScopes } from '@/permissions.ee/check-access';
import { TypeRestrictionProviderProxy } from '@/policy/type-restriction-provider-proxy.service';

import { BuilderRestrictedNodeTypes } from '../builder-restricted-node-types.service';

vi.mock('@/permissions.ee/check-access');

const GMAIL = 'n8n-nodes-base.gmailTrigger';
const user = { id: 'user-1' } as User;

const payloadFor = (workflowId?: string) =>
	({
		id: 'msg-1',
		message: 'Build it',
		workflowContext: workflowId ? { currentWorkflow: { id: workflowId } } : undefined,
	}) as unknown as ChatPayload;

describe('BuilderRestrictedNodeTypes', () => {
	const nodeTypes = mock<NodeTypes>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const projectRepository = mock<ProjectRepository>();
	const logger = mock<Logger>();
	const findRestrictedTypes = vi.fn();
	let proxy: TypeRestrictionProviderProxy;
	let service: BuilderRestrictedNodeTypes;

	beforeEach(() => {
		vi.resetAllMocks();
		proxy = new TypeRestrictionProviderProxy();
		proxy.registerProvider({ findRestrictedTypes });
		service = new BuilderRestrictedNodeTypes(
			proxy,
			nodeTypes,
			sharedWorkflowRepository,
			projectRepository,
			logger,
		);
		nodeTypes.getKnownTypes.mockReturnValue({ [GMAIL]: {}, 'n8n-nodes-base.set': {} } as never);
		sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue({
			id: 'project-1',
		} as never);
		projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue({
			id: 'personal',
		} as never);
		vi.mocked(userHasScopes).mockResolvedValue(true);
		findRestrictedTypes.mockResolvedValue(new Map([[GMAIL, { scope: 'instance' }]]));
	});

	it("asks about the open workflow's project and every known node type", async () => {
		const restricted = await service.find(payloadFor('wf-1'), user);

		expect(sharedWorkflowRepository.getWorkflowOwningProject).toHaveBeenCalledWith('wf-1');
		expect(findRestrictedTypes).toHaveBeenCalledWith('node', 'project-1', [
			GMAIL,
			'n8n-nodes-base.set',
		]);
		expect(restricted).toEqual([{ name: GMAIL, scope: 'instance' }]);
	});

	it('never loads a node class to name a restricted type', async () => {
		await service.find(payloadFor('wf-1'), user);

		expect(nodeTypes.getByName).not.toHaveBeenCalled();
	});

	it('prefers the project that owns the saved workflow over the one the editor reports', async () => {
		await service.find(payloadFor('wf-1'), user, 'editor-project');

		expect(findRestrictedTypes).toHaveBeenCalledWith('node', 'project-1', expect.any(Array));
		expect(userHasScopes).not.toHaveBeenCalled();
	});

	it('uses the editor project for a workflow that is not saved yet, when the user may create there', async () => {
		await service.find(payloadFor(), user, 'team-project');

		expect(userHasScopes).toHaveBeenCalledWith(user, ['workflow:create'], false, {
			projectId: 'team-project',
		});
		expect(findRestrictedTypes).toHaveBeenCalledWith('node', 'team-project', expect.any(Array));
	});

	it('ignores an editor project that the user may not create workflows in', async () => {
		vi.mocked(userHasScopes).mockResolvedValue(false);

		await service.find(payloadFor(), user, 'someone-elses-project');

		expect(findRestrictedTypes).toHaveBeenCalledWith('node', 'personal', expect.any(Array));
	});

	it("uses the user's personal project when nothing names a project", async () => {
		await service.find(payloadFor(), user);

		expect(sharedWorkflowRepository.getWorkflowOwningProject).not.toHaveBeenCalled();
		expect(findRestrictedTypes).toHaveBeenCalledWith('node', 'personal', expect.any(Array));
	});

	it('falls back to the personal project when the workflow has no owning project', async () => {
		sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(undefined as never);

		await service.find(payloadFor('wf-gone'), user);

		expect(findRestrictedTypes).toHaveBeenCalledWith('node', 'personal', expect.any(Array));
	});

	it('does no lookup while no policy module answers', async () => {
		const idle = new BuilderRestrictedNodeTypes(
			new TypeRestrictionProviderProxy(),
			nodeTypes,
			sharedWorkflowRepository,
			projectRepository,
			logger,
		);

		expect(await idle.find(payloadFor('wf-1'), user)).toEqual([]);
		expect(sharedWorkflowRepository.getWorkflowOwningProject).not.toHaveBeenCalled();
	});

	it('reports nothing and logs when the policy read fails', async () => {
		findRestrictedTypes.mockRejectedValue(new Error('policy store down'));

		expect(await service.find(payloadFor('wf-1'), user)).toEqual([]);
		expect(logger.warn).toHaveBeenCalled();
	});
});
