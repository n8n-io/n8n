import {
	Column,
	CreateDateColumn,
	Entity,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from '../../../../src';
import { ConfigurationEntity } from './configuration';

@Entity('locations')
export class LocationEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column({ length: 255 })
	name!: string;

	@Column({ default: true })
	active!: boolean;

	@CreateDateColumn()
	created_at!: Date;

	@UpdateDateColumn()
	updated_at!: Date;

	@OneToMany(
		() => ConfigurationEntity,
		(configuration) => configuration.location,
		{ cascade: true },
	)
	configurations!: ConfigurationEntity[];
}
