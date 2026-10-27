import { Column, Entity, PrimaryColumn } from '../../../../../../src';

@Entity()
export class Post {
	@PrimaryColumn({ primaryKeyConstraintName: 'PK_NAME_HEADER' })
	name: string;

	@Column({ primary: true, primaryKeyConstraintName: 'PK_NAME_HEADER' })
	header: string;
}
