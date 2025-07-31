import { WithStringId } from '@n8n/db';
import { Column, Entity, Index, JoinColumn, ManyToOne } from '@n8n/typeorm';

import { type DataStoreEntity } from './data-store.entity';

@Entity()
@Index(['dataStoreId', 'name'], { unique: true })
export class DataStoreColumnEntity extends WithStringId {
	@Column()
	dataStoreId: string;

	@Column()
	name: string;

	@Column({ type: 'varchar' })
	type: 'string' | 'number' | 'boolean' | 'date';

	@Column({ type: 'int' })
	columnIndex: number;

	@ManyToOne('DataStoreEntity', 'columns')
	@JoinColumn({ name: 'dataStoreId' })
	dataStore: DataStoreEntity;
}
