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

	@Column()
	value: number;

	@Column({ name: 'periodUnit' })
	private periodUnit_: number;

	get periodUnit() {
		if (!isValidPeriodNumber(this.periodUnit_)) {
			throw new UnexpectedError(
				`Period unit '${this.periodUnit_}' is not a valid unit for 'InsightsByPeriod.periodUnit'`,
			);
		}

		return NumberToPeriodUnit[this.periodUnit_];
	}

	set periodUnit(value: PeriodUnit) {
		this.periodUnit_ = PeriodUnitToNumber[value];
	}

	@DateTimeColumn()
	periodStart: Date;
}
