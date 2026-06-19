import { TarPackageWriter } from '@/modules/n8n-packages/io/tar/tar-package-writer';
import { FORMAT_VERSION } from '@/modules/n8n-packages/spec/constants';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';
import type { SerializedWorkflow } from '@/modules/n8n-packages/spec/serialized/workflow.schema';
import type { Readable } from 'node:stream';

export const PROTOTYPE_SOURCE_CREDENTIAL_ID = 'dev-slack-sales-alerts';
export const PROTOTYPE_WORKFLOW_ID = 'wf-customer-onboarding';

const SLACK_CREDENTIAL_TYPE = 'slackOAuth2Api';

export function customerOnboardingWorkflowV1(): SerializedWorkflow {
	return {
		id: PROTOTYPE_WORKFLOW_ID,
		name: 'Customer Onboarding',
		versionId: 'version-customer-onboarding-v1',
		parentFolderId: null,
		isPublished: true,
		isArchived: false,
		connections: {},
		nodes: [
			{
				id: 'manual-trigger',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		],
	};
}

function customerOnboardingWorkflowV2(): SerializedWorkflow {
	return {
		id: PROTOTYPE_WORKFLOW_ID,
		name: 'Customer Onboarding',
		versionId: 'version-customer-onboarding-v2',
		parentFolderId: null,
		isPublished: true,
		isArchived: false,
		connections: {
			'Manual Trigger': {
				main: [[{ node: 'Notify Sales in Slack', type: 'main', index: 0 }]],
			},
		},
		nodes: [
			{
				id: 'manual-trigger',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'slack-node',
				name: 'Notify Sales in Slack',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2,
				position: [280, 0],
				parameters: {
					resource: 'message',
					operation: 'post',
					channel: '#sales-alerts',
					text: 'New customer onboarded',
				},
				credentials: {
					[SLACK_CREDENTIAL_TYPE]: {
						id: PROTOTYPE_SOURCE_CREDENTIAL_ID,
						name: 'Slack – Sales Alerts (Dev)',
					},
				},
			},
		],
	};
}

export function getPromotionPrototypeWorkflowDiffs(): Array<{
	sourceWorkflowId: string;
	name: string;
	before: {
		id: string;
		name: string;
		versionId: string;
		nodes: SerializedWorkflow['nodes'];
		connections: SerializedWorkflow['connections'];
	};
	after: {
		id: string;
		name: string;
		versionId: string;
		nodes: SerializedWorkflow['nodes'];
		connections: SerializedWorkflow['connections'];
	};
}> {
	const before = customerOnboardingWorkflowV1();
	const after = customerOnboardingWorkflowV2();

	return [
		{
			sourceWorkflowId: before.id,
			name: before.name,
			before: {
				id: before.id,
				name: before.name,
				versionId: before.versionId,
				nodes: before.nodes,
				connections: before.connections,
			},
			after: {
				id: after.id,
				name: after.name,
				versionId: after.versionId,
				nodes: after.nodes,
				connections: after.connections,
			},
		},
	];
}

export async function buildPromotionPrototypePackageBuffer(): Promise<Buffer> {
	const workflow = customerOnboardingWorkflowV2();
	const writer = new TarPackageWriter();

	const manifest: PackageManifest = {
		packageFormatVersion: FORMAT_VERSION,
		exportedAt: new Date().toISOString(),
		sourceN8nVersion: '1.98.0',
		sourceId: 'dev-instance-7f3a',
		workflows: [
			{
				id: workflow.id,
				name: workflow.name,
				target: 'workflows/customer-onboarding',
			},
		],
		requirements: {
			credentials: [
				{
					id: PROTOTYPE_SOURCE_CREDENTIAL_ID,
					name: 'Slack – Sales Alerts (Dev)',
					type: SLACK_CREDENTIAL_TYPE,
					usedByWorkflows: [workflow.id],
				},
			],
		},
	};

	writer.writeFile('manifest.json', JSON.stringify(manifest, null, '\t'));
	writer.writeDirectory('workflows/customer-onboarding');
	writer.writeFile(
		'workflows/customer-onboarding/workflow.json',
		JSON.stringify(workflow, null, '\t'),
	);

	return await streamToBuffer(writer.finalize());
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer));
	}
	return Buffer.concat(chunks);
}
