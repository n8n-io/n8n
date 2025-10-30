import { testDb, mockInstance } from '@n8n/backend-test-utils';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { v4 as uuid } from 'uuid';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { CommunityPackagesService } from '@/modules/community-packages/community-packages.service';
import { NodeTypes } from '@/node-types';
import { OFFICIAL_RISKY_NODE_TYPES, NODES_REPORT } from '@/security-audit/constants';
import { PackagesRepository } from '@/security-audit/security-audit.repository';
import { SecurityAuditService } from '@/security-audit/security-audit.service';
import { toReportTitle } from '@/security-audit/utils';

import { getRiskSection, MOCK_PACKAGE, saveManualTriggerWorkflow } from './utils';

const nodesAndCredentials = mockInstance(LoadNodesAndCredentials);
nodesAndCredentials.getCustomDirectories.mockReturnValue([]);
mockInstance(NodeTypes);
const communityPackagesService = mockInstance(CommunityPackagesService);
Container.set(CommunityPackagesService, communityPackagesService);
const packagesRepository = mockInstance(PackagesRepository);

let securityAuditService: SecurityAuditService;

beforeAll(async () => {
	await testDb.init();

	securityAuditService = new SecurityAuditService(Container.get(WorkflowRepository), mock());
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity']);
});

afterAll(async () => {
	await testDb.terminate();
	jest.resetAllMocks();
});

test('should report risky official nodes', async () => {
	packagesRepository.find.mockResolvedValue(MOCK_PACKAGE);
	const map = [...OFFICIAL_RISKY_NODE_TYPES].reduce<{ [nodeType: string]: string }>((acc, cur) => {
		return (acc[cur] = uuid()), acc;
	}, {});

	const promises = Object.entries(map).map(async ([nodeType, nodeId]) => {
		const details = Container.get(WorkflowRepository).create({
			name: 'My Test Workflow',
			active: false,
			connections: {},
			nodes: [
				{
					id: nodeId,
					name: 'My Node',
					type: nodeType,
					typeVersion: 1,
					position: [0, 0] as [number, number],
					parameters: {},
				},
			],
		});

		return await Container.get(WorkflowRepository).save(details);
	});

	await Promise.all(promises);

	const testAudit = await securityAuditService.run(['nodes']);

	const section = getRiskSection(
		testAudit,
		NODES_REPORT.RISK,
		NODES_REPORT.SECTIONS.OFFICIAL_RISKY_NODES,
	);

	expect(section.location).toHaveLength(OFFICIAL_RISKY_NODE_TYPES.size);

	for (const loc of section.location) {
		if (loc.kind === 'node') {
			expect(loc.nodeId).toBe(map[loc.nodeType]);
		}
	}
});

test('should not report non-risky official nodes', async () => {
	packagesRepository.find.mockResolvedValue(MOCK_PACKAGE);
	await saveManualTriggerWorkflow();

	const testAudit = await securityAuditService.run(['nodes']);

	if (Array.isArray(testAudit)) return;

	const report = testAudit[toReportTitle('nodes')];

	if (!report) return;

	for (const section of report.sections) {
		expect(section.title).not.toBe(NODES_REPORT.SECTIONS.OFFICIAL_RISKY_NODES);
	}
});

test('should report community nodes', async () => {
	packagesRepository.find.mockResolvedValue(MOCK_PACKAGE);

	const testAudit = await securityAuditService.run(['nodes']);

	const section = getRiskSection(
		testAudit,
		NODES_REPORT.RISK,
		NODES_REPORT.SECTIONS.COMMUNITY_NODES,
	);

	expect(section.location).toHaveLength(1);

	if (section.location[0].kind === 'community') {
		expect(section.location[0].nodeType).toBe(MOCK_PACKAGE[0].installedNodes[0].type);
	}
});
