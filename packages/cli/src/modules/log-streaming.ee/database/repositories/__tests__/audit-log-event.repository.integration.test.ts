import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { AuditLogEvent } from '../../entities/audit-log-event.entity';
import { AuditLogEventRepository } from '../audit-log-event.repository';

const makeEvent = (id: string, eventName: string): AuditLogEvent =>
	Object.assign(new AuditLogEvent(), {
		id,
		eventName,
		message: eventName,
		ts: new Date(),
		payload: {},
	});

describe('AuditLogEventRepository', () => {
	let repository: AuditLogEventRepository;

	beforeAll(async () => {
		await testModules.loadModules(['log-streaming']);
		await testDb.init();
		repository = Container.get(AuditLogEventRepository);
	});

	beforeEach(async () => {
		await repository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('should filter by event-name prefix and return the total count', async () => {
		await repository.store(makeEvent('1', 'n8n.audit.user.login.success'));
		await repository.store(makeEvent('2', 'n8n.audit.workflow.created'));
		await repository.store(makeEvent('3', 'n8n.workflow.started'));

		const [audit, auditCount] = await repository.listByPrefix({
			prefix: 'n8n.audit',
			skip: 0,
			take: 10,
		});
		expect(auditCount).toBe(2);
		expect(audit.map((e) => e.id).sort()).toEqual(['1', '2']);

		const [all, allCount] = await repository.listByPrefix({ skip: 0, take: 10 });
		expect(allCount).toBe(3);
		expect(all).toHaveLength(3);
	});

	it('should page through results', async () => {
		await repository.store(makeEvent('1', 'n8n.audit.a'));
		await repository.store(makeEvent('2', 'n8n.audit.b'));
		await repository.store(makeEvent('3', 'n8n.audit.c'));

		const [page, count] = await repository.listByPrefix({ prefix: 'n8n.audit', skip: 0, take: 2 });
		expect(count).toBe(3);
		expect(page).toHaveLength(2);
	});
});
