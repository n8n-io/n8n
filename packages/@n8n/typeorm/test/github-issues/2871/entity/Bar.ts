import { BaseEntity, Column, PrimaryGeneratedColumn } from '../../../../src';

import { Entity } from '../../../../src/decorator/entity/Entity';

import { DocumentEnum } from '../documentEnum';
import { getEnumValues } from '../enumTools';

@Entity()
export class Bar extends BaseEntity {
	@PrimaryGeneratedColumn() barId: number;

	@Column({
		type: 'enum',
		enum: getEnumValues(DocumentEnum),
		array: true,
	})
	documents: DocumentEnum[];
}
