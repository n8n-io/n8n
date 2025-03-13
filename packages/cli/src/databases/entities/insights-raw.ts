import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from '@n8n/typeorm';
import { DateTime } from 'luxon';
import { UnexpectedError } from 'n8n-workflow';

import { datetimeColumnType } from './abstract-entity';
import { isValidTypeNumber, NumberToType, TypeToNumber } from './insights-shared';

export const { type: dbType } = Container.get(GlobalConfig).database;

@Entity()
export class InsightsRaw extends BaseEntity {
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

	@Column({
		name: 'timestamp',
		type: datetimeColumnType,
	})
	private timestamp_: number | Date;

	get timestamp() {
		if (this.timestamp_ instanceof Date) return this.timestamp_;
		return DateTime.fromSeconds(this.timestamp_, { zone: 'utc' }).toJSDate();
	}

	set timestamp(value: Date) {
		if (dbType === 'sqlite') {
			this.timestamp_ = Math.floor(value.getTime() / 1000);
		} else {
			this.timestamp_ = value;
		}
	}

	inspect() {
		console.log('inspect');
		return {
			...this,
			type: this.type,
			timestamp: this.timestamp,
		};
	}

	toJSON() {
		console.log('toJSON');
		const result = {
			...this,
			type_: undefined,
			timestamp_: undefined,
			type: this.type,
			timestamp: this.timestamp,
		};
		return result;
	}

	toString() {
		console.log('toString');
		const result = {
			...this,
			type_: undefined,
			timestamp_: undefined,
			type: this.type,
			timestamp: this.timestamp,
		};
		return JSON.stringify(result);
	}
}
