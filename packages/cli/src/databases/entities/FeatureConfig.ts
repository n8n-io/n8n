import { Column, Entity, PrimaryColumn } from 'typeorm';
import { jsonColumnType } from './AbstractEntity';

@Entity()
export class FeatureConfig {
	@PrimaryColumn()
	name: string;

	@Column(jsonColumnType)
	data: object;
}
