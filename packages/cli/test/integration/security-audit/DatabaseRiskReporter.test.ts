import { v4 as uuid } from 'uuid';
import { SecurityAuditService } from '@/security-audit/SecurityAudit.service';
import {
	DATABASE_REPORT,
	SQL_NODE_TYPES,
	SQL_NODE_TYPES_WITH_QUERY_PARAMS,
} from '@/security-audit/constants';
import { getRiskSection, saveManualTriggerWorkflow } from './utils';
import * as testDb from '../shared/testDb';
import { generateNanoId } from '@db/utils/generators';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import Container from 'typedi';

let securityAuditService: SecurityAuditService;

beforeAll(async () => {
	await testDb.init();

	securityAuditService = new SecurityAuditService(Container.get(WorkflowRepository));
});

beforeEach(async () => {
	await testDb.truncate(['Workflow']);
});

afterAll(async () => {
	await testDb.terminate();
});

test('should report expressions in queries', async () => {
	const map = [...SQL_NODE_TYPES].reduce<{ [nodeType: string]: string }>((acc, cur) => {
		return (acc[cur] = uuid()), acc;
	}, {});

	const promises = Object.entries(map).map(async ([nodeType, nodeId]) => {
		const details = {
			id: generateNanoId(),
			name: 'My Test Workflow',
			active: false,
			connections: {},
			nodeTypes: {},
			nodes: [
				{
					id: nodeId,
					name: 'My Node',
					type: nodeType,
					parameters: {
						operation: 'executeQuery',
						query: '=SELECT * FROM {{ $json.table }}',
						additionalFields: {},
					},
					typeVersion: 1,
					position: [0, 0] as [number, number],
				},
			],
		};

		return Container.get(WorkflowRepository).save(details);
	});

	await Promise.all(promises);

	const testAudit = await securityAuditService.run(['database']);

	const section = getRiskSection(
		testAudit,
		DATABASE_REPORT.RISK,
		DATABASE_REPORT.SECTIONS.EXPRESSIONS_IN_QUERIES,
	);

	expect(section.location).toHaveLength(SQL_NODE_TYPES.size);

	for (const loc of section.location) {
		if (loc.kind === 'node') {
			expect(loc.nodeId).toBe(map[loc.nodeType]);
		}
	}
});

test('should report expressions in query params', async () => {
	const map = [...SQL_NODE_TYPES_WITH_QUERY_PARAMS].reduce<{ [nodeType: string]: string }>(
		(acc, cur) => {
			return (acc[cur] = uuid()), acc;
		},
		{},
	);

	const promises = Object.entries(map).map(async ([nodeType, nodeId]) => {
		const details = {
			id: generateNanoId(),
			name: 'My Test Workflow',
			active: false,
			connections: {},
			nodeTypes: {},
			nodes: [
				{
					id: nodeId,
					name: 'My Node',
					type: nodeType,
					parameters: {
						operation: 'executeQuery',
						query: 'SELECT * FROM users WHERE id = $1;',
						additionalFields: {
							queryParams: '={{ $json.userId }}',
						},
					},
					typeVersion: 1,
					position: [0, 0] as [number, number],
				},
			],
		};

		return Container.get(WorkflowRepository).save(details);
	});

	await Promise.all(promises);

	const testAudit = await securityAuditService.run(['database']);

	const section = getRiskSection(
		testAudit,
		DATABASE_REPORT.RISK,
		DATABASE_REPORT.SECTIONS.EXPRESSIONS_IN_QUERY_PARAMS,
	);

	expect(section.location).toHaveLength(SQL_NODE_TYPES_WITH_QUERY_PARAMS.size);

	for (const loc of section.location) {
		if (loc.kind === 'node') {
			expect(loc.nodeId).toBe(map[loc.nodeType]);
		}
	}
});

test('should report unused query params', async () => {
	const map = [...SQL_NODE_TYPES_WITH_QUERY_PARAMS].reduce<{ [nodeType: string]: string }>(
		(acc, cur) => {
			return (acc[cur] = uuid()), acc;
		},
		{},
	);

	const promises = Object.entries(map).map(async ([nodeType, nodeId]) => {
		const details = {
			id: generateNanoId(),
			name: 'My Test Workflow',
			active: false,
			connections: {},
			nodeTypes: {},
			nodes: [
				{
					id: nodeId,
					name: 'My Node',
					type: nodeType,
					parameters: {
						operation: 'executeQuery',
						query: 'SELECT * FROM users WHERE id = 123;',
					},
					typeVersion: 1,
					position: [0, 0] as [number, number],
				},
			],
		};

		return Container.get(WorkflowRepository).save(details);
	});

	await Promise.all(promises);

	const testAudit = await securityAuditService.run(['database']);

	const section = getRiskSection(
		testAudit,
		DATABASE_REPORT.RISK,
		DATABASE_REPORT.SECTIONS.UNUSED_QUERY_PARAMS,
	);

	expect(section.location).toHaveLength(SQL_NODE_TYPES_WITH_QUERY_PARAMS.size);

	for (const loc of section.location) {
		if (loc.kind === 'node') {
			expect(loc.nodeId).toBe(map[loc.nodeType]);
		}
	}
});

test('should not report non-database node', async () => {
	await saveManualTriggerWorkflow();

	const testAudit = await securityAuditService.run(['database']);

	expect(testAudit).toBeEmptyArray();
});
