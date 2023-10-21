import { Column, Entity, Index, OneToMany } from 'typeorm';
import { IsString, Length } from 'class-validator';
import type { WorkflowEntity } from './WorkflowEntity';
import { WithTimestampsAndStringId } from './AbstractEntity';

@Entity()
export class FolderEntity extends WithTimestampsAndStringId {
	@Column({ length: 24 })
	@Index({ unique: true })
	@IsString({ message: 'Folder name must be of type string.' })
	@Length(1, 24, { message: 'Folder name must be $constraint1 to $constraint2 characters long.' })
	name: string;

	@OneToMany('WorkflowEntity', 'folder')
	workflows: WorkflowEntity[];
}
