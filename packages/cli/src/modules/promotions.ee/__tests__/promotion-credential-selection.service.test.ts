import type { CredentialsFinderService } from '@n8n/backend-services';
import type { CredentialsEntity, SharedCredentialsRepository, User } from '@n8n/db';
import { BadRequestError, ForbiddenError } from '@n8n/errors';
import { Credentials } from 'n8n-core';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { PromotionCredentialSelectionService } from '../promotion-credential-selection.service';

const user = mock<User>({ id: 'user-1' });

async function encrypted(data: ICredentialDataDecryptedObject): Promise<string> {
	const credentials = new Credentials({ id: 'fixture', name: 'fixture' }, 'httpHeaderAuth');
	await credentials.setData(data);
	return credentials.getDataToSave().data!;
}

let withValues: string;
let withoutValues: string;
let emptyStrings: string;
let emptyStructures: string;
let falseValue: string;

beforeAll(async () => {
	withValues = await encrypted({ name: 'X-Key', value: 'secret' });
	withoutValues = await encrypted({});
	emptyStrings = await encrypted({ name: '', value: '' });
	emptyStructures = await encrypted({ oauthTokenData: {}, scopes: [''] });
	falseValue = await encrypted({ allowUnauthorizedCerts: false });
});

const credential = (overrides: Partial<CredentialsEntity> = {}): CredentialsEntity =>
	({
		id: 'cred-1',
		name: 'CRM key',
		type: 'httpHeaderAuth',
		data: withValues,
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

		it.each([
			['no key', () => withoutValues],
			['only empty values', () => emptyStrings],
			['only empty objects and arrays', () => emptyStructures],
		])('leaves out a credential with %s', async (_label, data) => {
			const { service } = setup([credential({ data: data() })]);

			await expect(service.findSelectableIds(user, 'project-1')).resolves.toEqual([]);
		});

		it('keeps a credential whose only value is false', async () => {
			const { service } = setup([credential({ data: falseValue })]);

			await expect(service.findSelectableIds(user, 'project-1')).resolves.toEqual(['cred-1']);
		});

		it('decrypts a credential once until it changes', async () => {
			const spy = vi.spyOn(Credentials.prototype, 'getData');
			const stamped = credential({ updatedAt: new Date('2026-01-01') });
			const { service } = setup([stamped]);

			await service.findSelectableIds(user, 'project-1');
			await service.findSelectableIds(user, 'project-1');
			expect(spy).toHaveBeenCalledTimes(1);

			stamped.updatedAt = new Date('2026-02-01');
			await service.findSelectableIds(user, 'project-1');
			expect(spy).toHaveBeenCalledTimes(2);
			spy.mockRestore();
		});

		it('leaves out a credential that the user cannot read', async () => {
			const { service, finder } = setup([credential()], []);

			await expect(service.findSelectableIds(user, 'project-1')).resolves.toEqual([]);
			expect(finder.findCredentialIdsWithScopeForUser).toHaveBeenCalledWith(['cred-1'], user, [
				'credential:read',
			]);
		});
	});

	describe('assertSelectable', () => {
		it('does nothing when the selection holds no credential', async () => {
			const { service, shared } = setup([]);

			await service.assertSelectable(user, 'project-1', []);

			expect(shared.findOwnedCredentialsByProjects).not.toHaveBeenCalled();
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

		it('refuses a credential with no values', async () => {
			const { service } = setup([credential({ data: withoutValues })]);

			await expect(service.assertSelectable(user, 'project-1', ['cred-1'])).rejects.toThrow(
				BadRequestError,
			);
		});
	});
});
