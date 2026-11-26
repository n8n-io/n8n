import { ModuleRegistry } from '@n8n/backend-common';
import { AiPreferenceService, InstanceWriteAccessService } from '@n8n/backend-services';
import { AiPreferenceRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { randomUUID } from 'node:crypto';

import { streamToBuffer } from '@/modules/n8n-packages/__tests__/utils/tar-support';
import { TarPackageWriter } from '@/modules/n8n-packages/io/tar/tar-package-writer';
import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

const server = setupTestServer({ endpointGroups: ['publicApi'] });
let owner: User;
const repository = () => Container.get(AiPreferenceRepository);

beforeAll(async () => {
	Container.get(ModuleRegistry).settings.set('mcp', { mcpAccessEnabled: true });
	owner = await createOwnerWithApiKey();
});
beforeEach(async () => {
	await repository().delete({});
	Container.get(InstanceWriteAccessService).setReadOnly(false);
});
afterEach(() => Container.get(InstanceWriteAccessService).setReadOnly(false));

async function archive(
	id = randomUUID(),
	content = 'Use clear names',
	additional: { id: string; content: string }[] = [],
) {
	const items = [{ id, content }, ...additional];
	const writer = new TarPackageWriter();
	writer.writeFile(
		'manifest.json',
		JSON.stringify({
			packageFormatVersion: '3',
			sourceId: 'source',
			sourceN8nVersion: '2.50.0',
			preferences: items.map(({ id }) => ({ id, name: 'Preference', target: `preferences/${id}` })),
		}),
	);
	for (const { id, content } of items) {
		writer.writeFile(
			`preferences/${id}/preference.json`,
			JSON.stringify({ id, scope: 'instance', content }),
		);
	}
	return await streamToBuffer(writer.finalize());
}

it('exports shared Preferences with Preference API key scopes and reports the actual count', async () => {
	const actor = await createOwnerWithApiKey({ scopes: ['aiPreference:read', 'aiPreference:list'] });
	const row = await Container.get(AiPreferenceService).create(
		actor,
		{ scope: 'instance', content: 'Export' },
		'ui',
	);
	const response = await server
		.publicApiAgentFor(actor)
		.post('/n8n-packages/export')
		.send({ preferenceIds: [row.id] });
	expect(response.statusCode).toBe(200);
	expect(JSON.parse(response.headers['x-n8n-export-counts'])).toMatchObject({ preferences: 1 });
});

it('imports and explicitly replaces Preferences through multipart fields', async () => {
	const id = randomUUID();
	const agent = server.publicApiAgentFor(owner);
	const initialArchive = await archive(id);
	const changedArchive = await archive(id, 'Changed');
	const create = await agent
		.post('/n8n-packages/import')
		.field('conflictPolicy', 'fail')
		.attach('package', initialArchive, 'preferences.n8np');
	expect(create.statusCode, JSON.stringify(create.body)).toBe(200);
	expect(create.body.counts.preferences).toEqual({
		created: 1,
		updated: 0,
		removed: 0,
		skipped: 0,
	});
	const conflict = await agent
		.post('/n8n-packages/import')
		.field('conflictPolicy', 'new-version')
		.attach('package', changedArchive, 'preferences.n8np');
	expect(conflict.statusCode).toBe(409);
	expect(conflict.body.issues).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ type: 'preference-conflict', kind: 'conflict' }),
		]),
	);
	const replace = await agent
		.post('/n8n-packages/import')
		.field('conflictPolicy', 'fail')
		.field('preferenceConflictPolicy', 'replace')
		.attach('package', changedArchive, 'preferences.n8np');
	expect(replace.statusCode).toBe(200);
	expect(replace.body.counts.preferences.updated).toBe(1);
	expect(await repository().findOneByOrFail({ id })).toMatchObject({
		content: 'Changed',
		source: 'import',
		createdById: owner.id,
	});
});

it('rejects missing action scopes and insufficient user permissions before writes', async () => {
	const readOnly = await createOwnerWithApiKey({ scopes: ['aiPreference:read'] });
	const member = await createMemberWithApiKey({ scopes: ['aiPreference:create'] });
	for (const [actor, expected] of [
		[readOnly, 403],
		[member, 422],
	] as const) {
		const buffer = await archive();
		const result = await server
			.publicApiAgentFor(actor)
			.post('/n8n-packages/import')
			.field('conflictPolicy', 'fail')
			.attach('package', buffer, 'preferences.n8np');
		expect(result.statusCode, JSON.stringify(result.body)).toBe(expected);
	}
	expect(await repository().count()).toBe(0);
});

it('rejects malformed Preference fields and protected writes', async () => {
	const buffer = await archive();
	const agent = server.publicApiAgentFor(owner);
	const invalid = await agent
		.post('/n8n-packages/import')
		.field('conflictPolicy', 'fail')
		.field('deletedPreferenceIds', '["invalid"]')
		.attach('package', buffer, 'preferences.n8np');
	expect(invalid.statusCode).toBe(400);
	Container.get(InstanceWriteAccessService).setReadOnly(true);
	const result = await agent
		.post('/n8n-packages/import')
		.field('conflictPolicy', 'fail')
		.attach('package', buffer, 'preferences.n8np');
	expect(result.statusCode, JSON.stringify(result.body)).toBe(422);
	expect(result.body.issues).toEqual([expect.objectContaining({ kind: 'forbidden' })]);
	const ordinary = await agent
		.post('/ai-preferences')
		.send({ scope: 'instance', content: 'Protected' });
	expect(ordinary.statusCode).toBe(403);
	expect(await repository().count()).toBe(0);
});

it.each([409, 500])('returns completed Preference results after HTTP %i', async (status) => {
	const firstId = randomUUID();
	const secondId = randomUUID();
	const buffer = await archive(firstId, 'First', [{ id: secondId, content: 'Second' }]);
	const create = repository().createPreference.bind(repository());
	const error =
		status === 409 ? new ConflictError('Preference changed') : new Error('Database detail');
	const write = vi
		.spyOn(repository(), 'createPreference')
		.mockImplementationOnce(create)
		.mockRejectedValueOnce(error);
	try {
		const result = await server
			.publicApiAgentFor(owner)
			.post('/n8n-packages/import')
			.field('conflictPolicy', 'fail')
			.attach('package', buffer, 'preferences.n8np');
		expect(result.statusCode, JSON.stringify(result.body)).toBe(status);
		expect(result.body.preferences).toEqual([{ id: firstId, scope: 'instance', status: 'create' }]);
		expect(result.body.counts.preferences).toEqual({
			created: 1,
			updated: 0,
			removed: 0,
			skipped: 0,
		});
		expect(JSON.stringify(result.body)).not.toContain('Database detail');
		expect(await repository().existsBy({ id: firstId })).toBe(true);
		expect(await repository().existsBy({ id: secondId })).toBe(false);
	} finally {
		write.mockRestore();
	}
});
