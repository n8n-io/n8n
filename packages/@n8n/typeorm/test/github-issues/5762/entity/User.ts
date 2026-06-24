import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryColumn, Column } from '../../../../src';
import { URL } from 'url';

@Entity()
export class User {
	@PrimaryColumn()
	id: number;

	@Column({
		type: String,
		// marshall
		transformer: {
			from(value: string): URL {
				return new URL(value);
			},
			to(value: URL): string {
				return value.toString();
			},
		},
	})
	url: URL;
}
