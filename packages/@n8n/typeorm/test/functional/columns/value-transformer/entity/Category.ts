import { Column, Entity, PrimaryGeneratedColumn, ValueTransformer } from '../../../../../src';
import { encrypt, lowercase } from './User';

const trim: ValueTransformer = {
	to: (entityValue: string) => {
		return entityValue.trim();
	},
	from: (databaseValue: string) => {
		return databaseValue;
	},
};

@Entity()
export class Category {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ transformer: [lowercase, trim, encrypt] })
	description: string;
}
