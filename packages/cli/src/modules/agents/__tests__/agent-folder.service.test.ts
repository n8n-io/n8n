import type { ProjectScopeService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { AgentFolderService } from '../agent-folder.service';
import type { AgentPublishService } from '../agent-publish.service';
import type { ProjectAgent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';

vi.mock('../agent-publish.service', () => ({ AgentPublishService: class {} }));

describe('AgentFolderService', () => {
	const user = mock<User>();
	const repository = mock<AgentRepository>();
	const publication = mock<AgentPublishService>();
	const scopes = mock<ProjectScopeService>();
	const service = new AgentFolderService(repository, publication, scopes);

	beforeEach(() => {
		vi.resetAllMocks();
		scopes.hasScopes.mockResolvedValue(true);
	});

	it('uses the normal archive lifecycle and skips Agents that are already archived', async () => {
		repository.findInFolders.mockResolvedValue([
			mock<ProjectAgent>({ id: 'active', isArchived: false }),
			mock<ProjectAgent>({ id: 'archived', isArchived: true }),
		]);

		await service.archiveContents(user, 'project', ['parent', 'child']);

		expect(scopes.hasScopes).toHaveBeenCalledWith(user, 'project', ['agent:delete']);
		expect(repository.findInFolders).toHaveBeenCalledWith('project', ['parent', 'child']);
		expect(publication.archiveAgent).toHaveBeenCalledExactlyOnceWith('active', 'project', user);
	});

	it('rejects archival without Agent delete permission before reading contents', async () => {
		scopes.hasScopes.mockResolvedValue(false);

		await expect(service.archiveContents(user, 'project', ['folder'])).rejects.toThrow(
			'permission',
		);

		expect(repository.findInFolders).not.toHaveBeenCalled();
		expect(publication.archiveAgent).not.toHaveBeenCalled();
	});

	it('stops and reports a lifecycle failure', async () => {
		repository.findInFolders.mockResolvedValue([
			mock<ProjectAgent>({ id: 'first', isArchived: false }),
			mock<ProjectAgent>({ id: 'second', isArchived: false }),
		]);
		const error = new Error('Archive failed');
		publication.archiveAgent.mockRejectedValueOnce(error);

		await expect(service.archiveContents(user, 'project', ['folder'])).rejects.toBe(error);

		expect(publication.archiveAgent).toHaveBeenCalledExactlyOnceWith('first', 'project', user);
	});
});
