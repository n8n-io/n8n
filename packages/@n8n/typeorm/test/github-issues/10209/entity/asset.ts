import {
	Column,
	CreateDateColumn,
	DeleteDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from '../../../../src';
import { ConfigurationEntity } from './configuration';

export enum AssetStatus {
	new = 0,
	deleted = -999,
}

@Entity('assets')
export class AssetEntity {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column({ length: 255 })
	name!: string;

	@Column({ type: 'uuid' })
	configuration_id!: string;

	@Column()
	status!: AssetStatus;

	@CreateDateColumn()
	created_at!: Date;

	@UpdateDateColumn()
	updated_at!: Date;

	@DeleteDateColumn()
	deleted_at!: Date | null;

	@ManyToOne(() => ConfigurationEntity, { nullable: false })
	@JoinColumn({ name: 'configuration_id' })
	configuration!: ConfigurationEntity;
}
