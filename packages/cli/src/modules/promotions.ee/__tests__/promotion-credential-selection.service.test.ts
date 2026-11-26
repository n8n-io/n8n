import type { CredentialsFinderService } from '@n8n/backend-services';
import type { CredentialsEntity, SharedCredentialsRepository, User } from '@n8n/db';
import { BadRequestError, ForbiddenError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { PromotionCredentialSelectionService } from '../promotion-credential-selection.service';

const user = mock<User>({ id: 'user-1' });

const credential = (overrides: Partial<CredentialsEntity> = {}): CredentialsEntity =>
	({
		id: 'cred-1',
		name: 'CRM key',
		type: 'httpHeaderAuth',
		data: 'encrypted',
		usageScope: 'project',
		...overrides,
	}) as CredentialsEntity;

function setup(owned: CredentialsEntity[], readable: string[] = owned.map(({ id }) => id)) {
	const shared = mock<SharedCredentialsRepository>();
	shared.findOwnedCredentialsByProjects.mockResolvedValue(owned);
	const finder = mock<CredentialsFinderService>();
	finder.findCredentialIdsWithScopeForUser.mockResolvedValue(new Set(readable));
	return { service: new PromotionCredentialSelectionService(shared, finder), shared, finder };
}

describe('PromotionCredentialSelectionService', () => {
	describe('findSelectableIds', () => {
		it('leaves out an instance credential', async () => {
			const { service } = setup([credential({ id: 'shared', usageScope: 'instance' })]);

			await expect(service.findSelectableIds(user, 'project-1')).resolves.toEqual([]);
		});

		it('keeps a credential that holds no values, and reads none of them', async () => {
			const { service } = setup([credential({ data: '' })]);

			await expect(service.findSelectableIds(user, 'project-1')).resolves.toEqual(['cred-1']);
		});

		it('leaves out a credential that the user cannot read', async () => {
			const { service, finder } = setup([credential()], []);

			await expect(service.findSelectableIds(user, 'project-1')).resolves.toEqual([]);
			expect(finder.findCredentialIdsWithScopeForUser).toHaveBeenCalledWith(['cred-1'], user, [
				'credential:read',
			]);
		});

		it('lists the ids in a stable order', async () => {
			const { service } = setup([credential({ id: 'b' }), credential({ id: 'a' })]);

			await expect(service.findSelectableIds(user, 'project-1')).resolves.toEqual(['a', 'b']);
		});
	});

	describe('assertSelectable', () => {
		it('does nothing when the selection holds no credential', async () => {
			const { service, shared } = setup([]);

			await service.assertSelectable(user, 'project-1', []);

			expect(shared.findOwnedCredentialsByProjects).not.toHaveBeenCalled();
		});

		it('accepts a credential that holds no values', async () => {
			const { service } = setup([credential({ data: '' })]);

			await expect(
				service.assertSelectable(user, 'project-1', ['cred-1']),
			).resolves.toBeUndefined();
		});

		it('refuses an instance credential as not selectable', async () => {
			const { service } = setup([credential({ usageScope: 'instance' })]);

			await expect(service.assertSelectable(user, 'project-1', ['cred-1'])).rejects.toThrow(
				BadRequestError,
			);
		});

		it('refuses a credential that the user cannot read', async () => {
			const { service } = setup([credential()], []);

			await expect(service.assertSelectable(user, 'project-1', ['cred-1'])).rejects.toThrow(
				ForbiddenError,
			);
		});
	});
});
