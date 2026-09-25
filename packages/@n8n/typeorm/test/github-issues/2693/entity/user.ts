import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Entity } from '../../../../src/decorator/entity/Entity';

@Entity({ name: 'users', synchronize: false })
export class User {
	@PrimaryGeneratedColumn('uuid')
	id: number;
}
