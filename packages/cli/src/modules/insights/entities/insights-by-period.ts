import {
	BaseEntity,
	Column,
	Entity,
	JoinColumn,
	OneToOne,
	PrimaryGeneratedColumn,
} from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import { InsightsMetadata } from './insights-metadata';
import type { PeriodUnits } from './insights-shared';
import {
	isValidPeriodNumber,
	isValidTypeNumber,
	NumberToPeriodUnit,
	NumberToType,
	PeriodUnitToNumber,
	TypeToNumber,
} from './insights-shared';
import { datetimeColumnType } from '../../../databases/entities/abstract-entity';

@Entity()
export class InsightsByPeriod extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	metaId: number;

	@OneToOne(() => InsightsMetadata)
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

	set periodUnit(value: PeriodUnits) {
		this.periodUnit_ = PeriodUnitToNumber[value];
	}

	@Column({ type: datetimeColumnType })
	periodStart: Date;
}
