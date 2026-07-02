import { PrimaryGeneratedColumn, ManyToMany, JoinTable } from '../../../../src';
import { Entity } from '../../../../src/decorator/entity/Entity';
import {
	AnotherReallyLongNameForAnEntityBecauseThisIsNecessaryB,
	AnotherRealLongNameForAnEntityBecauseThisIsNecessaryC,
} from './other-long-name.entity';

@Entity({
	name: 'real_long_name_t1',
})
export class ThisIsARealLongNameForAnEntityBecauseThisIsNecessary {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToMany(() => AnotherReallyLongNameForAnEntityBecauseThisIsNecessaryB, {
		eager: true,
	})
	@JoinTable({ name: 'junction_b' })
	long_name_for_bs!: AnotherReallyLongNameForAnEntityBecauseThisIsNecessaryB[];

	@ManyToMany(() => AnotherRealLongNameForAnEntityBecauseThisIsNecessaryC, {
		eager: true,
	})
	@JoinTable({ name: 'junction_c' })
	long_name_for_cs!: AnotherRealLongNameForAnEntityBecauseThisIsNecessaryC[];
}
