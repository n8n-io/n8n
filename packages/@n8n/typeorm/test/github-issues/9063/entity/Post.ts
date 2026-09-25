import { Column, Entity, Generated, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ generated: 'uuid' })
	generatedUuid1: string;

	@Generated('uuid')
	@Column({ type: 'uuid' })
	generatedUuid2: string;

	@Column({ type: 'uuid', default: () => 'uuid_generate_v4()' })
	generatedUuid3: string;

	@Column({ type: 'character varying', default: () => 'uuid_generate_v4()' })
	nonGeneratedUuid1: string;

	@Column({ type: 'character varying', default: () => 'gen_random_uuid()' })
	nonGeneratedUuid2: string;
}
