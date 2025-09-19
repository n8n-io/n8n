import { GlobalConfig } from '@n8n/config';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import nock from 'nock';
import { v4 as uuid } from 'uuid';

import * as constants from '@/constants';
import type { InstalledNodes } from '@/modules/community-packages/installed-nodes.entity';
import type { InstalledPackages } from '@/modules/community-packages/installed-packages.entity';
import type { Risk } from '@/security-audit/types';
import { toReportTitle } from '@/security-audit/utils';

type GetSectionKind<C extends Risk.Category> = C extends 'instance'
	? Risk.InstanceSection
	: Risk.StandardSection;

export function getRiskSection<C extends Risk.Category>(
	testAudit: Risk.Audit | never[],
	riskCategory: C,
	sectionTitle: string,
): GetSectionKind<C> {
	if (Array.isArray(testAudit)) {
		throw new Error('Expected test audit not to be an array');
	}

	const report = testAudit[toReportTitle(riskCategory)];

	if (!report) throw new Error(`Expected risk "${riskCategory}"`);

	for (const section of report.sections) {
		if (section.title === sectionTitle) {
			return section as GetSectionKind<C>;
		}
	}

	throw new Error(`Expected section "${sectionTitle}" for risk "${riskCategory}"`);
}

export async function saveManualTriggerWorkflow() {
	const details = {
		id: '1',
		name: 'My Test Workflow',
		active: false,
		connections: {},
		nodeTypes: {},
		nodes: [
			{
				id: uuid(),
				name: 'My Node',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0] as [number, number],
			},
		],
	};

	return await Container.get(WorkflowRepository).save(details);
}

export const MOCK_09990_N8N_VERSION = {
	name: '0.999.0',
	nodes: [
		{
			name: 'n8n-nodes-base.testNode',
			displayName: 'Test Node',
			icon: 'file:testNode.svg',
			defaults: {
				name: 'Test Node',
			},
		},
	],
	createdAt: '2022-11-11T11:11:11.111Z',
	description:
		'Includes <strong>new nodes</strong>, <strong>node enhancements</strong>, <strong>core functionality</strong> and <strong>bug fixes</strong>',
	documentationUrl: 'https://docs.n8n.io/reference/release-notes/#n8n09990',
	hasBreakingChange: false,
	hasSecurityFix: false,
	hasSecurityIssue: false,
	securityIssueFixVersion: null,
};

export const MOCK_01110_N8N_VERSION = {
	name: '0.111.0',
	nodes: [],
	createdAt: '2022-01-01T00:00:00.000Z',
	description:
		'Includes <strong>new nodes</strong>, <strong>node enhancements</strong>, <strong>core functionality</strong> and <strong>bug fixes</strong>',
	documentationUrl: 'https://docs.n8n.io/reference/release-notes/#n8n01110',
	hasBreakingChange: false,
	hasSecurityFix: false,
	hasSecurityIssue: false,
	securityIssueFixVersion: null,
};

export const MOCK_PACKAGE: InstalledPackages[] = [
	{
		createdAt: new Date(),
		updatedAt: new Date(),
		packageName: 'n8n-nodes-test',
		installedVersion: '1.1.2',
		authorName: 'test',
		authorEmail: 'test@test.com',
		setUpdateDate: () => {},
		installedNodes: [
			{
				name: 'My Test Node',
				type: 'myTestNode',
				latestVersion: 1,
			} as InstalledNodes,
		],
	},
];

export function simulateOutdatedInstanceOnce(versionName = MOCK_01110_N8N_VERSION.name) {
	const baseUrl = Container.get(GlobalConfig).versionNotifications.endpoint + '/';

	// @ts-expect-error readonly export
	constants.N8N_VERSION = versionName;

	nock(baseUrl).get(versionName).reply(200, [MOCK_01110_N8N_VERSION, MOCK_09990_N8N_VERSION]);
}

export function simulateUpToDateInstance(versionName = MOCK_09990_N8N_VERSION.name) {
	const baseUrl = Container.get(GlobalConfig).versionNotifications.endpoint + '/';

	// @ts-expect-error readonly export
	constants.N8N_VERSION = versionName;

	nock(baseUrl).persist().get(versionName).reply(200, [MOCK_09990_N8N_VERSION]);
}
