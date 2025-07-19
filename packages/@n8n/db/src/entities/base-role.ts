import { Column, PrimaryColumn } from '@n8n/typeorm';

import { Scope } from './scope';

/**
 * Base class for roles, which can be extended for specific role types.
 * This class defines the common properties that all roles will have.
 */
export abstract class BaseRole {
	@PrimaryColumn({
		type: String,
		name: 'slug',
	})
	slug: string;

	@Column({
		type: String,
		nullable: false,
		name: 'displayName',
	})
	displayName: string | null;

	@Column({
		type: String,
		nullable: true,
		name: 'description',
	})
	description: string | null;

	@Column({
		type: Boolean,
		default: false,
		name: 'systemRole',
	})
	systemRole: boolean; // Indicates if the role is managed by the system and cannot be edited

	abstract scopes: Scope[];
}
