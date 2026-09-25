import { FindOperator } from '../FindOperator';
import { ObjectLiteral } from '../../common/ObjectLiteral';

/**
 * Find Options Operator.
 * Example: { someField: Raw("12") }
 */
export function Raw<T>(value: string): FindOperator<any>;

/**
 * Find Options Operator.
 * Example: { someField: Raw((columnAlias) => `${columnAlias} = 5`) }
 */
export function Raw<T>(sqlGenerator: (columnAlias: string) => string): FindOperator<any>;

/**
 * Find Options Operator.
 * For escaping parameters use next syntax:
 * Example: { someField: Raw((columnAlias) => `${columnAlias} = :value`, { value: 5 }) }
 */
export function Raw<T>(
	sqlGenerator: (columnAlias: string) => string,
	parameters: ObjectLiteral,
): FindOperator<any>;

export function Raw<T>(
	valueOrSqlGenerator: string | ((columnAlias: string) => string),
	sqlGeneratorParameters?: ObjectLiteral,
): FindOperator<any> {
	if (typeof valueOrSqlGenerator !== 'function') {
		return new FindOperator('raw', valueOrSqlGenerator, false);
	}

	return new FindOperator('raw', [], true, true, valueOrSqlGenerator, sqlGeneratorParameters);
}
