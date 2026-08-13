import { DateTimeColumn } from '@n8n/db';
import {
	BaseEntity,
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import { InsightsMetadata } from './insights-metadata';
import type { PeriodUnit } from './insights-shared';
import {
	isValidPeriodNumber,
	isValidTypeNumber,
	NumberToPeriodUnit,
	NumberToType,
	PeriodUnitToNumber,
	TypeToNumber,
} from './insights-shared';

@Entity()
export class InsightsByPeriod extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	metaId: number;

	@ManyToOne(() => InsightsMetadata)
	@JoinColumn({ name: 'metaId' })
	metadata: InsightsMetadata;

	@Column({ name: 'type', type: 'int' })
	private type_: number;

	get type() {
		const typeValue = this.type_;
		if (!isValidTypeNumber(typeValue)) {
			throw new UnexpectedError(
				`Type '${typeValue}' is not a valid type for 'InsightsByPeriod.type'`,
			);
		}

		return NumberToType[typeValue];
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

	@Column({ name: 'periodUnit' })
	private periodUnit_: number;

	get periodUnit() {
		const periodUnitValue = this.periodUnit_;
		if (!isValidPeriodNumber(periodUnitValue)) {
			throw new UnexpectedError(
				`Period unit '${periodUnitValue}' is not a valid unit for 'InsightsByPeriod.periodUnit'`,
			);
		}

		return NumberToPeriodUnit[periodUnitValue];
	}

	set periodUnit(value: PeriodUnit) {
		this.periodUnit_ = PeriodUnitToNumber[value];
	}

	@DateTimeColumn()
	periodStart: Date;
}
