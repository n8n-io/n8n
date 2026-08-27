import { PrimaryColumn } from '../../../../src';

export class Slug {
	@PrimaryColumn()
	slug: string;

	constructor(slug: string) {
		this.slug = slug;
	}
}
