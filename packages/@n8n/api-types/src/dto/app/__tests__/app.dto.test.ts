import { CreateAppDto } from '../create-app.dto';
import { ListAppsQueryDto } from '../list-apps-query.dto';
import { UpdateAppDto } from '../update-app.dto';
import { PublishAppDto } from '../publish-app.dto';
import { appSchema, appVersionSchema } from '../../../schemas/app.schema';

describe('app DTOs', () => {
	it('trims names and namespaces and defaults to project visibility', () => {
		expect(CreateAppDto.parse({ name: ' App ', namespace: ' my-app ' })).toEqual({
			name: 'App',
			namespace: 'my-app',
			visibility: 'project',
		});
	});

	it.each(['', ' ', 'My-App', '-app', 'app-', 'app--name', '../app', 'a'.repeat(64)])(
		'rejects namespace %j',
		(namespace) => {
			expect(CreateAppDto.safeParse({ name: 'App', namespace }).success).toBe(false);
		},
	);

	it.each(['', ' ', 'a'.repeat(129)])('rejects name %j', (name) => {
		expect(CreateAppDto.safeParse({ name, namespace: 'app' }).success).toBe(false);
	});

	it.each(['public', 'project', 'instance'])('accepts %s visibility', (visibility) => {
		expect(CreateAppDto.parse({ name: 'App', namespace: 'app', visibility }).visibility).toBe(
			visibility,
		);
		expect(UpdateAppDto.parse({ visibility }).visibility).toBe(visibility);
	});

	it.each(['none', 'n8n', 'private', ''])('rejects visibility %j', (visibility) => {
		expect(CreateAppDto.safeParse({ name: 'App', namespace: 'app', visibility }).success).toBe(
			false,
		);
		expect(UpdateAppDto.safeParse({ visibility }).success).toBe(false);
	});

	it('keeps authentication, project ownership, and version selection out of metadata updates', () => {
		expect(CreateAppDto.safeParse({ name: 'App', namespace: 'app', auth: 'n8n' }).success).toBe(
			false,
		);
		expect(UpdateAppDto.safeParse({ auth: 'n8n' }).success).toBe(false);
		expect(UpdateAppDto.safeParse({ projectId: 'other' }).success).toBe(false);
		expect(UpdateAppDto.safeParse({ draftVersionId: 'version' }).success).toBe(false);
		expect(UpdateAppDto.safeParse({ publishedVersionId: 'version' }).success).toBe(false);
	});

	it('bounds pagination and restricts sorting', () => {
		expect(ListAppsQueryDto.parse({ take: '1000' }).take).toBe(250);
		expect(ListAppsQueryDto.safeParse({ sortBy: 'projectId:asc' }).success).toBe(false);
		expect(ListAppsQueryDto.safeParse({ skip: '-1' }).success).toBe(false);
	});

	it('requires UUID app and version IDs and accepts string project IDs', () => {
		const uuid = '11111111-1111-4111-8111-111111111111';
		const app = {
			id: uuid,
			projectId: 'aBcDeFgHiJkLmNoP',
			name: 'App',
			namespace: 'app',
			visibility: 'project',
			draftVersionId: uuid,
			publishedVersionId: null,
			publishedUrl: null,
			createdAt: '2026-10-13T00:00:00.000Z',
			updatedAt: '2026-10-13T00:00:00.000Z',
		};
		expect(appSchema.safeParse(app).success).toBe(true);
		expect(appSchema.safeParse({ ...app, id: app.projectId }).success).toBe(false);
		expect(appSchema.safeParse({ ...app, draftVersionId: app.projectId }).success).toBe(false);
		expect(appSchema.safeParse({ ...app, publishedVersionId: app.projectId }).success).toBe(false);
		expect(appVersionSchema.shape.id.safeParse(uuid).success).toBe(true);
		expect(appVersionSchema.shape.appId.safeParse(uuid).success).toBe(true);
		expect(appVersionSchema.shape.id.safeParse(app.projectId).success).toBe(false);
		expect(appVersionSchema.shape.appId.safeParse(app.projectId).success).toBe(false);
	});

	it('requires an explicit version UUID for publication', () => {
		expect(PublishAppDto.safeParse({}).success).toBe(false);
		expect(PublishAppDto.safeParse({ versionId: 'latest' }).success).toBe(false);
		expect(
			PublishAppDto.safeParse({ versionId: '11111111-1111-4111-8111-111111111111' }).success,
		).toBe(true);
	});
});
