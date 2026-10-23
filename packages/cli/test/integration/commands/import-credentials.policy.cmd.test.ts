/**
 * One command run per file: the policy module registers its implementation once per process,
 * so a second `init()` in the same file would throw.
 */
import { Logger } from '@n8n/backend-common';
import { getPersonalProject, mockInstance, testDb, testModules } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES, type BooleanLicenseFeature } from '@n8n/constants';
import { PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import '@/zod-alias-support';
import { ImportCredentialsCommand } from '@/commands/import/credentials';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { CREDENTIAL_TYPES_KIND } from '@/modules/type-availability-policies/constants';
import { TypeAvailabilityPolicyService } from '@/modules/type-availability-policies/type-availability-policy.service';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { createCredentials, getAllCredentials } from '../shared/db/credentials';
import { createMember, createOwner } from '../shared/db/users';

const BLOCKED = 'githubApi';
const BLOCKED_IN_OTHER_PROJECT = 'slackApi';
const ALLOWED = 'httpBasicAuth';

beforeAll(async () => {
	await testModules.loadModules(['policy-infrastructure', 'type-availability-policies']);
});

mockInstance(LoadNodesAndCredentials, { loaders: {} });
mockInstance(License, {
	isLicensed: (feature: BooleanLicenseFeature) =>
		feature === LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES,
});
const command = setupTestCommand(ImportCredentialsCommand);

afterAll(async () => {
	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
		'SharedCredentials',
		'CredentialsEntity',
	]);
});

test('import:credentials skips blocked credentials and imports the rest', async () => {
	const owner = await createOwner();
	const ownerProject = await getPersonalProject(owner);
	const otherProject = await getPersonalProject(await createMember());
	await createCredentials(
		{ id: 'stored-github', name: 'old', type: BLOCKED, data: '' },
		ownerProject,
	);
	// Owned elsewhere: judging it before the ownership check would abort the whole import.
	await createCredentials(
		{ id: 'stored-basic', name: 'old-basic', type: ALLOWED, data: '' },
		otherProject,
	);
	await Container.get(TypeAvailabilityPolicyService).setEffectivePolicy(
		CREDENTIAL_TYPES_KIND,
		null,
		{
			rules: [{ id: 'deny-github', action: 'deny', selector: { kind: 'name', value: BLOCKED } }],
			defaultAction: 'allow',
		},
		0,
		owner.id,
	);
	// Only the owning project denies it, so judging it in the target project would admit it.
	await Container.get(TypeAvailabilityPolicyService).setEffectivePolicy(
		CREDENTIAL_TYPES_KIND,
		otherProject.id,
		{
			rules: [
				{
					id: 'deny-slack',
					action: 'deny',
					selector: { kind: 'name', value: BLOCKED_IN_OTHER_PROJECT },
				},
			],
			defaultAction: 'allow',
		},
		0,
		owner.id,
	);

	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-credential-import-'));
	const inputPath = path.join(directory, 'credentials.json');
	fs.writeFileSync(
		inputPath,
		JSON.stringify([
			{ id: 'new-github', name: 'new-github', type: BLOCKED, data: { accessToken: 'x' } },
			{ id: 'stored-github', name: 'renamed', type: BLOCKED, data: { accessToken: 'x' } },
			{
				id: 'stored-basic',
				name: 'retyped',
				type: BLOCKED_IN_OTHER_PROJECT,
				data: { accessToken: 'x' },
			},
			{ id: 'new-basic', name: 'new-basic', type: ALLOWED, data: { user: 'u', password: 'p' } },
			{ name: 'no-id', type: ALLOWED, data: { user: 'u', password: 'p' } },
		]),
	);
	const warn = vi.spyOn(Container.get(Logger), 'warn');

	try {
		await command.run([`--input=${inputPath}`, `--projectId=${ownerProject.id}`]);
	} finally {
		fs.rmSync(directory, { recursive: true, force: true });
	}

	// By id, not by importing the class: the import would register the check itself.
	const registeredIds = Container.get(PolicyCheckMetadata)
		.getClasses()
		.map((checkClass) => Container.get(checkClass).id);
	expect(registeredIds).toContain('credential-type-availability');

	const credentials = await getAllCredentials();
	expect(
		credentials
			.map(({ name, type }) => ({ name, type }))
			.sort((a, b) => a.name.localeCompare(b.name)),
	).toEqual([
		{ name: 'new-basic', type: ALLOWED },
		{ name: 'no-id', type: ALLOWED },
		// An import is judged on its own type, so an unchanged blocked type is not grandfathered.
		{ name: 'old', type: BLOCKED },
		{ name: 'old-basic', type: ALLOWED },
	]);

	const skipped = warn.mock.calls
		.map(([message]) => message)
		.filter((message) => message.startsWith('Skipping credential'));
	expect(skipped).toEqual([
		expect.stringContaining('new-github'),
		expect.stringContaining('stored-github'),
		expect.stringContaining('stored-basic'),
	]);
});
