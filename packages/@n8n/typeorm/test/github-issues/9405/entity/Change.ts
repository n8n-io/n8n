import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from '../../../../src/index';
import { ChangeLog } from './ChangeLog';

@Entity()
export class Change<T> {
	@PrimaryGeneratedColumn('increment')
	id: number;

	@Column('varchar', { nullable: false, length: 255 })
	propertyName: string;

	@Column('json', { nullable: true })
	oldValue?: any;

	@Column('json', { nullable: true })
	newValue?: any;

	@ManyToOne(() => ChangeLog, {
		cascade: false,
		nullable: false,
		onDelete: 'CASCADE',
	})
	public log: ChangeLog<T>;
}
