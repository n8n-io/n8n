import { Entity } from '../../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { DeleteDateColumn } from '../../../../../src/decorator/columns/DeleteDateColumn';
import { Column } from '../../../../../src/decorator/columns/Column';
import { Photo } from './Photo';
import { JoinColumn, OneToOne } from '../../../../../src';

@Entity()
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	name: string;

	@Column()
	likesCount: number = 0;

	@OneToOne(() => Photo)
	@JoinColumn()
	picture: Photo;

	@DeleteDateColumn()
	deletedAt: Date;
}
