import type { AuthenticatedRequest, Project } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
import { mock } from 'jest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import type { SourceControlContextFactory } from '../source-control-context.factory';
import { SourceControlScopedService } from '../source-control-scoped.service';
import type { SourceControlContext } from '../types/source-control-context';

jest.mock('@n8n/permissions', () => ({
	...jest.requireActual('@n8n/permissions'),
	hasGlobalScope: jest.fn(),
}));

describe('SourceControlScopedService', () => {
	const contextFactory = mock<SourceControlContextFactory>();
	const service = new SourceControlScopedService(contextFactory, mock());

	const req = mock<AuthenticatedRequest>({ user: {} });

	beforeEach(() => {
		jest.mocked(hasGlobalScope).mockReset().mockReturnValue(false);
		contextFactory.createContext.mockReset();
	});

	describe('ensureIsAllowedToGetStatus', () => {
		it('should allow callers holding any global source control scope without touching projects', async () => {
			jest.mocked(hasGlobalScope).mockReturnValue(true);

			await expect(service.ensureIsAllowedToGetStatus(req)).resolves.toBeUndefined();

			expect(hasGlobalScope).toHaveBeenCalledWith(req.user, [
				'sourceControl:pull',
				'sourceControl:push',
				'sourceControl:manage',
			]);
			expect(contextFactory.createContext).not.toHaveBeenCalled();
		});

		it('should allow project-level push admins (authorized projects present)', async () => {
			contextFactory.createContext.mockResolvedValue(
				mock<SourceControlContext>({ authorizedProjects: [mock<Project>()] }),
			);

			await expect(service.ensureIsAllowedToGetStatus(req)).resolves.toBeUndefined();
		});

		it('should reject callers with no global scope and no authorized projects', async () => {
			contextFactory.createContext.mockResolvedValue(
				mock<SourceControlContext>({ authorizedProjects: [] }),
			);

			await expect(service.ensureIsAllowedToGetStatus(req)).rejects.toThrow(ForbiddenError);
		});
	});
});
