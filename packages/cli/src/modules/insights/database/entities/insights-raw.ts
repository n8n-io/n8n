import { GlobalConfig } from '@n8n/config';
import { DateTimeColumn } from '@n8n/db';
import { Container } from '@n8n/di';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import { isValidTypeNumber, NumberToType, TypeToNumber } from './insights-shared';

export const { type: dbType } = Container.get(GlobalConfig).database;

@Entity()
export class InsightsRaw extends BaseEntity {
	constructor() {
		super();
		this.timestamp = new Date();
	}

	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	metaId: number;

	@Column({ name: 'type', type: 'int' })
	private type_: number;

	get type() {
		if (!isValidTypeNumber(this.type_)) {
			throw new UnexpectedError(
				`Type '${this.type_}' is not a valid type for 'InsightsByPeriod.type'`,
			);
		}

		return NumberToType[this.type_];
	}

	set type(value: keyof typeof TypeToNumber) {
		this.type_ = TypeToNumber[value];
	}

	/**
	 * Stored as BIGINT in database (see migration 1759399811000).
	 * JavaScript number type has precision limits at ±2^53-1 (9,007,199,254,740,991).
	 * Values exceeding Number.MAX_SAFE_INTEGER will lose precision.
	 */
	@Column()
	value: number;

	@DateTimeColumn({ name: 'timestamp' })
	timestamp: Date;
}
