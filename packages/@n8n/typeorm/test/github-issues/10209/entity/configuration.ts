import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from '../../../../src';
import { AssetEntity } from './asset';
import { LocationEntity } from './location';

export enum ConfigurationStatus {
	deleted = -999,
	new = 0,
}

@Entity('configurations')
export class ConfigurationEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column({ length: 255 })
	name!: string;

	@Column()
	status!: ConfigurationStatus;

	@Column({ type: 'uuid', nullable: false })
	location_id!: string;

	@ManyToOne(() => LocationEntity, { nullable: false })
	@JoinColumn({ name: 'location_id' })
	location!: LocationEntity;

	@Column({ default: true })
	active!: boolean;

	@OneToMany(
		() => AssetEntity,
		(asset) => asset.configuration,
		{
			cascade: true,
		},
	)
	assets!: AssetEntity[];

	@CreateDateColumn()
	created_at!: Date;

	@UpdateDateColumn()
	updated_at!: Date;
}
