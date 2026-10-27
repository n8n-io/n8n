/**
 * One command run per file: the policy module registers its implementation once per process,
 * so a second `init()` in the same file would throw.
 */
import { Logger } from '@n8n/backend-common';
import { getAllWorkflows, mockInstance, testDb, testModules } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES, type BooleanLicenseFeature } from '@n8n/constants';
import { WorkflowPublishHistoryRepository } from '@n8n/db';
import { PolicyCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import '@/zod-alias-support';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { ImportWorkflowsCommand } from '@/commands/import/workflow';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NODE_TYPES_KIND } from '@/modules/type-availability-policies/constants';
import { TypeAvailabilityPolicyService } from '@/modules/type-availability-policies/type-availability-policy.service';
import { NodeTypes } from '@/node-types';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { createOwner } from '../shared/db/users';

const BLOCKED = 'n8n-nodes-base.code';
const ALLOWED = 'n8n-nodes-base.set';

beforeAll(async () => {
	await testModules.loadModules(['policy-infrastructure', 'type-availability-policies']);
});

mockInstance(LoadNodesAndCredentials, { loaders: {} });
mockInstance(ActiveWorkflowManager);
mockInstance(WorkflowPublishHistoryRepository);
mockInstance(NodeTypes, {
	resolveBaseName: (name: string) => ({ baseName: name, isSyntheticTool: false }),
});
mockInstance(License, {
	isLicensed: (feature: BooleanLicenseFeature) =>
		feature === LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES,
});
const command = setupTestCommand(ImportWorkflowsCommand);

afterAll(async () => {
	await testDb.truncate([
		'TypeAvailabilityPolicyAttachment',
		'TypeAvailabilityPolicyScope',
		'TypeAvailabilityPolicy',
		'SharedWorkflow',
		'WorkflowEntity',
	]);
});

const workflowWith = (id: string, nodeType: string) => ({
	id,
	name: id,
	nodes: [
		{
			id: `${id}-node`,
			name: 'Node',
			type: nodeType,
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
	],
	connections: {},
	active: false,
	settings: {},
	versionId: `${id}-version`,
});

test('import:workflow skips a workflow with a blocked node and imports the rest', async () => {
	const owner = await createOwner();
	await Container.get(TypeAvailabilityPolicyService).setEffectivePolicy(
		NODE_TYPES_KIND,
		null,
		{
			rules: [{ id: 'deny-code', action: 'deny', selector: { kind: 'name', value: BLOCKED } }],
			defaultAction: 'allow',
		},
		0,
		owner.id,
	);

	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-workflow-import-'));
	const inputPath = path.join(directory, 'workflows.json');
	fs.writeFileSync(
		inputPath,
		JSON.stringify([workflowWith('with-code', BLOCKED), workflowWith('with-set', ALLOWED)]),
	);
	const warn = vi.spyOn(Container.get(Logger), 'warn');

	try {
		await command.run([`--input=${inputPath}`]);
	} finally {
		fs.rmSync(directory, { recursive: true, force: true });
	}

	// By id, not by importing the class: the import would register the check itself.
	const registeredIds = Container.get(PolicyCheckMetadata)
		.getClasses()
		.map((checkClass) => Container.get(checkClass).id);
	expect(registeredIds).toContain('node-type-availability');

	const workflows = await getAllWorkflows();
	expect(workflows.map(({ id }) => id)).toEqual(['with-set']);
	expect(warn).toHaveBeenCalledWith(
		expect.stringContaining('Skipped workflow "with-code"'),
		expect.anything(),
	);
});
