import { ViewColumn, ViewEntity } from '../../../../../src';

@ViewEntity({
	name: 'view_b',
	expression: `select * from view_a -- V1 simulate view change with comment`,
	dependsOn: ['ViewA'],
})
export class ViewB {
	@ViewColumn()
	id: number;

	@ViewColumn()
	type: string;
}
