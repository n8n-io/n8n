import { ViewColumn, ViewEntity } from '../../../../src';

@ViewEntity({
	expression: `
        select * from test_entity -- V1 simlate view change with comment
    `,
})
export class ViewC {
	@ViewColumn()
	id: number;

	@ViewColumn()
	type: string;
}
