import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class User {
	// test PrimaryGeneratedColumn
	@PrimaryGeneratedColumn('identity', { generatedIdentity: 'ALWAYS' })
	id: number;

	// test explicit `ALWAYS`
	@Column({
		type: 'bigint',
		generated: 'identity',
		generatedIdentity: 'ALWAYS',
	})
	secondId: number;

	// test explicit `BY DEFAULT`
	@Column({
		type: 'int',
		generated: 'identity',
		generatedIdentity: 'BY DEFAULT',
	})
	thirdId: number;

	// test default `generatedIdentity`
	@Column({ type: 'int', generated: 'identity' })
	fourthId: number;
}
