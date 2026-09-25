import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { Tree } from '../../../../src/decorator/tree/Tree';
import { TreeChildren } from '../../../../src/decorator/tree/TreeChildren';
import { TreeParent } from '../../../../src/decorator/tree/TreeParent';

@Entity({ name: 'users', schema: 'admin' })
@Tree('nested-set')
export class User {
	@PrimaryGeneratedColumn('uuid')
	id: number;

	@TreeParent()
	public manager: User;

	@TreeChildren()
	public managerOf: User[];
}
