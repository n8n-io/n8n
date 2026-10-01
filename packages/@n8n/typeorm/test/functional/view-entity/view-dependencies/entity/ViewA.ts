import { ViewColumn, ViewEntity } from '../../../../../src';

@ViewEntity({
	name: 'view_a',
	expression: `
        select * from test_entity -- V1 simulate view change with comment
    `,
})
export class ViewA {
	@ViewColumn()
	id: number;

	@ViewColumn()
	type: string;
}
