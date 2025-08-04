import { Column, Entity, Index, OneToMany } from '@n8n/typeorm';
import { IsObject, IsString, Length } from 'class-validator';

import { WithTimestampsAndStringId } from './abstract-entity';
import type { SharedCredentials } from './shared-credentials';
import type { ICredentialsDb } from './types-db';

@Entity()
export class CredentialsEntity extends WithTimestampsAndStringId implements ICredentialsDb {
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

	/**
	 * Whether the credential is managed by n8n. We currently use this flag
	 * to provide OpenAI free credits on cloud. Managed credentials cannot be
	 * edited by the user.
	 */
	@Column({ default: false })
	isManaged: boolean;

	toJSON() {
		const { shared, ...rest } = this;
		return rest;
	}
}
