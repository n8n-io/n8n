import type { ICredentialNodeAccess } from 'n8n-workflow';
import { Column, Entity, Generated, Index, OneToMany, PrimaryColumn } from 'typeorm';
import { IsArray, IsObject, IsString, Length } from 'class-validator';
import type { SharedCredentials } from './SharedCredentials';
import { AbstractEntity, jsonColumnType } from './AbstractEntity';
import type { ICredentialsDb } from '@/Interfaces';
import { idStringifier } from '../utils/transformers';

@Entity()
export class CredentialsEntity extends AbstractEntity implements ICredentialsDb {
	@Generated()
	@PrimaryColumn({ transformer: idStringifier })
	id: string;

	@Column({ length: 128 })
	@IsString({ message: 'Credential `name` must be of type string.' })
	@Length(3, 128, {
		message: 'Credential name must be $constraint1 to $constraint2 characters long.',
	})
	name: string;

	@Column('text')
	@IsObject()
	data: string;

	@Index()
	@IsString({ message: 'Credential `type` must be of type string.' })
	@Column({
		length: 128,
	})
	type: string;

	@OneToMany('SharedCredentials', 'credentials')
	shared: SharedCredentials[];

	@Column(jsonColumnType)
	@IsArray()
	nodesAccess: ICredentialNodeAccess[];
}
