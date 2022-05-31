import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import config from '../../../config';

@Entity()
export class PinData {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		type: config.getEnv('database.type') === 'sqlite' ? 'text' : 'json',
	})
	data: object;
}
