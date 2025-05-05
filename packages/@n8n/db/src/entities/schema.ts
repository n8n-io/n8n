import { Column, Entity } from '@n8n/typeorm';
import { IDataObject } from 'n8n-workflow';

import { JsonColumn, WithTimestampsAndStringId } from './abstract-entity';

@Entity('schemas')
export class Schema extends WithTimestampsAndStringId {
	@Column('varchar')
	name: string;

	@JsonColumn({ nullable: false })
	definition: IDataObject;
}
