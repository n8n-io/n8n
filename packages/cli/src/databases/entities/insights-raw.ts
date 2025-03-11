import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import { timestampColumnDefault, timestampColumnType } from './abstract-entity';
import { isValidTypeNumber, NumberToType, TypeToNumber } from './insights-shared';

@Entity()
export class InsightsRaw extends BaseEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	metaId: number;

	@Column({ name: 'type', type: 'int' })
	private type_: keyof typeof NumberToType;

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

	@Column({ name: 'timestamp', type: timestampColumnType, default: timestampColumnDefault })
	private timestamp_: number;

	get timestamp() {
		return new Date(this.timestamp_ * 1000);
	}

	set timestamp(value: Date) {
		this.timestamp_ = Math.floor(value.getTime() / 1000);
	}
}
