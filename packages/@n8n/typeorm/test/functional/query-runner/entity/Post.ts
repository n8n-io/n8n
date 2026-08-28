import { Check, Column, Entity, Exclusion, PrimaryColumn, Unique } from '../../../../src';

@Entity()
@Unique(['text', 'tag'])
@Exclusion(`USING gist ("name" WITH =)`)
@Check(`"version" < 999`) // should be properly escaped for each driver.
// @Check(`\`version\` < 999`) // should be properly escaped for each driver.
export class Post {
	@PrimaryColumn()
	id: number;

	@Column({ unique: true })
	version: number;

	@Column({ default: 'My post' })
	name: string;

	@Column()
	text: string;

	@Column()
	tag: string;
}
