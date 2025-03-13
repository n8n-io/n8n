import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';
import { z } from 'zod';

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

	static fromRaw(value: unknown) {
		const schema = z.object({
			id: z.number(),
			metaId: z.number(),
			type: z.number(),
			//.refine((v) => {
			//	if (isValidType(v, NumberToType)) {
			//		return v;
			//	} else {
			//		throw new Error();
			//	}
			//})
			//.transform((v) => NumberToType[v]),
			value: z.number(),
			periodUnit: z.number(),
			//.refine((v) => {
			//	if (isValidType(v, NumberToPeriodUnit)) {
			//		return v;
			//	}
			//}),
			periodStart: z.number(),
		});
		const rawEvent = schema.parse(value);
		const event = new InsightsByPeriod();
		event.id = rawEvent.id;
		event.metaId = rawEvent.metaId;
		event.type = NumberToType[rawEvent.type as TypeUnitNumbers];
		event.value = rawEvent.value;
		event.periodUnit = NumberToPeriodUnit[rawEvent.periodUnit as PeriodUnitNumbers];
		event.periodStart = new Date(rawEvent.periodStart * 1000);

		return event;
	}
}
