import { ViewColumn, ViewEntity } from '../../../../src';

@ViewEntity({
	expression: `SELECT * FROM "post"`,
})
export class PostView {
	@ViewColumn()
	id: number;

	@ViewColumn()
	type: string;
}
