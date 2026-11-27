import type { User } from '@n8n/db';
import { BadRequestError, ForbiddenError, LockedError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentArchiveService } from '../agent-archive.service';
import type { ProjectAgent } from '../entities/agent.entity';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

type Dependencies = ConstructorParameters<typeof AgentArchiveService>;

const user = mock<User>({ id: 'user-1', disabled: false });
const agent = mock<ProjectAgent>({
	name: 'Support Agent',
	isArchived: false,
	availableInMCP: false,
});
const target = [user.id, 'project-1', 'agent-1'] as const;

function setup() {
	const users = mock<Dependencies[0]>();
	const agents = mock<Dependencies[1]>();
	const settings = mock<Dependencies[2]>();
	const publish = mock<Dependencies[3]>();
	const writeLock = mock<Dependencies[4]>();
	const instanceWriteAccess = mock<Dependencies[5]>();
	users.findByIdWithRole.mockResolvedValue(user);
	agents.findByIdAndProjectId.mockResolvedValue(agent);
	settings.assertEnabled.mockResolvedValue(undefined);
	publish.archiveAgent.mockResolvedValue(agent);
	writeLock.ensureAgentEditable.mockResolvedValue(undefined);
	instanceWriteAccess.isReadOnly.mockReturnValue(false);
	const service = new AgentArchiveService(
		users,
		agents,
		settings,
		publish,
		writeLock,
		instanceWriteAccess,
	);
	return { service, users, agents, settings, publish, writeLock, instanceWriteAccess };
}

describe('AgentArchiveService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(userHasScopes).mockResolvedValue(true);
	});

	it('previews without mutation and uses the archive lifecycle without MCP access', async () => {
		const { service, agents, publish, writeLock } = setup();
		await expect(service.preview(...target)).resolves.toEqual({ name: agent.name });
		expect(publish.archiveAgent).not.toHaveBeenCalled();

		await expect(service.archive(...target)).resolves.toEqual({ name: agent.name });
		expect(userHasScopes).toHaveBeenCalledTimes(2);
		expect(userHasScopes).toHaveBeenLastCalledWith(user, ['agent:delete'], false, {
			projectId: 'project-1',
		});
		expect(agents.findByIdAndProjectId).toHaveBeenCalledWith('agent-1', 'project-1');
		expect(writeLock.ensureAgentEditable).toHaveBeenCalledTimes(2);
		expect(writeLock.ensureAgentEditable).toHaveBeenLastCalledWith('agent-1');
		expect(publish.archiveAgent).toHaveBeenCalledExactlyOnceWith(
			'agent-1',
			'project-1',
			user,
			undefined,
			'builder',
		);
	});

	it('does not look up the target if the caller lacks the project scope', async () => {
		const { service, agents, publish } = setup();
		vi.mocked(userHasScopes).mockResolvedValue(false);
		await expect(service.preview(...target)).rejects.toThrow(ForbiddenError);
		expect(agents.findByIdAndProjectId).not.toHaveBeenCalled();
		expect(publish.archiveAgent).not.toHaveBeenCalled();
	});

	it('rejects missing or out-of-project targets before checking the lock', async () => {
		const { service, agents, writeLock, publish } = setup();
		agents.findByIdAndProjectId.mockResolvedValue(null);
		await expect(service.preview(...target)).rejects.toThrow(NotFoundError);
		await expect(service.archive(...target)).rejects.toThrow(NotFoundError);
		expect(writeLock.ensureAgentEditable).not.toHaveBeenCalled();
		expect(publish.archiveAgent).not.toHaveBeenCalled();
	});

	it.each([
		['scope revoked', ForbiddenError],
		['account disabled', ForbiddenError],
		['Agents disabled', ForbiddenError],
		['read-only', ForbiddenError],
		['locked', LockedError],
		['already archived', BadRequestError],
	] as const)(
		'refuses to archive after preview if the state changes: %s',
		async (change, error) => {
			const { service, users, agents, settings, publish, writeLock, instanceWriteAccess } = setup();
			await service.preview(...target);

			if (change === 'scope revoked') vi.mocked(userHasScopes).mockResolvedValue(false);
			if (change === 'account disabled')
				users.findByIdWithRole.mockResolvedValue(mock<User>({ disabled: true }));
			if (change === 'Agents disabled')
				settings.assertEnabled.mockRejectedValue(new ForbiddenError('Agents are disabled'));
			if (change === 'read-only') instanceWriteAccess.isReadOnly.mockReturnValue(true);
			if (change === 'locked')
				writeLock.ensureAgentEditable.mockRejectedValue(new LockedError('Agent is locked'));
			if (change === 'already archived')
				agents.findByIdAndProjectId.mockResolvedValue(mock<ProjectAgent>({ isArchived: true }));

			await expect(service.archive(...target)).rejects.toThrow(error);
			expect(publish.archiveAgent).not.toHaveBeenCalled();
		},
	);
});
