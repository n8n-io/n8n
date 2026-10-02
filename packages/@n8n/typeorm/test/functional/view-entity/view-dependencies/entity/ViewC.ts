import { ViewColumn, ViewEntity } from '../../../../../src';

@ViewEntity({
	name: 'view_c',
	expression: `select * from view_b -- V1 simulate view change with comment`,
	dependsOn: ['ViewB'],
})
export class ViewC {
	@ViewColumn()
	id: number;

	@ViewColumn()
	type: string;
}
