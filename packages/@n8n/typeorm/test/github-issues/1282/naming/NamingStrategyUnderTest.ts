import { DefaultNamingStrategy } from '../../../../src/naming-strategy/DefaultNamingStrategy';
import { NamingStrategyInterface } from '../../../../src/naming-strategy/NamingStrategyInterface';
import { camelCase } from '../../../../src/util/StringUtils';

export class NamingStrategyUnderTest
	extends DefaultNamingStrategy
	implements NamingStrategyInterface
{
	calledJoinTableColumnName: boolean[] = [];

	calledJoinTableInverseColumnName: boolean[] = [];

	joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
		this.calledJoinTableColumnName.push(true);
		return camelCase(tableName + '_' + (columnName ? columnName : propertyName) + '_forward');
	}

	joinTableInverseColumnName(tableName: string, propertyName: string, columnName?: string): string {
		this.calledJoinTableInverseColumnName.push(true);
		return camelCase(tableName + '_' + (columnName ? columnName : propertyName) + '_inverse');
	}
}
