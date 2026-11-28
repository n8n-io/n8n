import { CreateAppDto } from '../create-app.dto';
import { ListAppsQueryDto } from '../list-apps-query.dto';
import { UpdateAppDto } from '../update-app.dto';
import { PublishAppDto } from '../publish-app.dto';
import { RestoreAppVersionDto } from '../restore-app-version.dto';
import { SetAppBindingsDto } from '../set-app-bindings.dto';
import { appSchema, appVersionSchema } from '../../../schemas/app.schema';

describe('app DTOs', () => {
	it('needs the draft version that a restore is based on', () => {
		const baseVersionId = '0190a8d6-4a2e-7000-8000-0000000000d1';
		expect(RestoreAppVersionDto.safeParse({ baseVersionId }).success).toBe(true);
		expect(RestoreAppVersionDto.safeParse({ baseVersionId: null }).success).toBe(true);
		expect(RestoreAppVersionDto.safeParse({}).success).toBe(false);
		expect(RestoreAppVersionDto.safeParse({ baseVersionId: 'draft' }).success).toBe(false);
	});

	it('needs the draft version that a binding change is based on', () => {
		const baseVersionId = '0190a8d6-4a2e-7000-8000-0000000000d1';
		expect(SetAppBindingsDto.safeParse({ baseVersionId, bindings: [] }).success).toBe(true);
		expect(SetAppBindingsDto.safeParse({ baseVersionId: null, bindings: [] }).success).toBe(true);
		expect(SetAppBindingsDto.safeParse({ bindings: [] }).success).toBe(false);
		expect(SetAppBindingsDto.safeParse({ baseVersionId: 'draft', bindings: [] }).success).toBe(
			false,
		);
	});

	it('trims names and namespaces', () => {
		expect(CreateAppDto.parse({ name: ' App ', namespace: ' my-app ' })).toEqual({
			name: 'App',
			namespace: 'my-app',
		});
	});

	it.each(['', ' ', 'My-App', '-app', 'app-', 'app--name', '../app', 'a'.repeat(55)])(
		'rejects namespace %j',
		(namespace) => {
			expect(CreateAppDto.safeParse({ name: 'App', namespace }).success).toBe(false);
		},
	);

	it.each(['', ' ', 'a'.repeat(129)])('rejects name %j', (name) => {
		expect(CreateAppDto.safeParse({ name, namespace: 'app' }).success).toBe(false);
	});

	it.each(['project', 'instance'])('rejects the %s visibility field', (visibility) => {
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

	const versionId = '11111111-1111-4111-8111-111111111111';

	it('requires an explicit version UUID for publication', () => {
		expect(PublishAppDto.safeParse({ label: 'v1' }).success).toBe(false);
		expect(PublishAppDto.safeParse({ versionId: 'latest', label: 'v1' }).success).toBe(false);
		expect(PublishAppDto.safeParse({ versionId, label: 'v1' }).success).toBe(true);
	});

	it('requires a version name of at most 128 characters for publication', () => {
		expect(PublishAppDto.parse({ versionId, label: '  Launch  ' }).label).toBe('Launch');
		expect(PublishAppDto.safeParse({ versionId }).success).toBe(false);
		expect(PublishAppDto.safeParse({ versionId, label: ' ' }).success).toBe(false);
		expect(PublishAppDto.safeParse({ versionId, label: 'a'.repeat(129) }).success).toBe(false);
	});

	it('accepts an optional description for publication', () => {
		const dto = PublishAppDto.parse({
			versionId,
			label: 'v1',
			description: ' Adds charts ',
		});
		expect(dto).toEqual({
			versionId,
			label: 'v1',
			description: 'Adds charts',
		});
		expect(PublishAppDto.safeParse({ versionId, label: 'v1', visibility: 'project' }).success).toBe(
			false,
		);
		expect(
			PublishAppDto.safeParse({ versionId, label: 'v1', description: 'a'.repeat(2001) }).success,
		).toBe(false);
	});

	it('accepts an optional boolean to publish the attached resources', () => {
		expect(PublishAppDto.parse({ versionId, label: 'v1' }).publishResources).toBeUndefined();
		expect(PublishAppDto.parse({ versionId, label: 'v1', publishResources: true })).toEqual({
			versionId,
			label: 'v1',
			publishResources: true,
		});
		expect(
			PublishAppDto.safeParse({ versionId, label: 'v1', publishResources: 'yes' }).success,
		).toBe(false);
	});
});
