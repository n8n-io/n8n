import { Service } from '@n8n/di';
import { DataSource, Like, Repository } from '@n8n/typeorm';

import { AuditLogEvent } from '../entities/audit-log-event.entity';

@Service()
export class AuditLogEventRepository extends Repository<AuditLogEvent> {
	constructor(dataSource: DataSource) {
		super(AuditLogEvent, dataSource.manager);
	}

	async store(event: AuditLogEvent) {
		await this.save(event);
	}

	async listByPrefix({ prefix, skip, take }: { prefix?: string; skip: number; take: number }) {
		return await this.findAndCount({
			where: prefix ? { eventName: Like(`${prefix}%`) } : {},
			order: { ts: 'DESC' },
			skip,
			take,
		});
	}
}
