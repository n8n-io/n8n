import type { Scope as ScopeType } from '@n8n/permissions';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

@Entity({
	name: 'scope',
})
export class Scope {
	@PrimaryColumn({
		type: String,
		name: 'slug',
	})
	slug: ScopeType;

	@Column({
		type: String,
		nullable: true,
		name: 'displayName',
	})
	displayName: string | null;

	@Column({
		type: String,
		nullable: true,
		name: 'description',
	})
	description: string | null;
}
