import { FindOperator } from "../FindOperator";
import { ObjectLiteral } from "../../common/ObjectLiteral";
/**
 * Find Options Operator.
 * Example: { someField: Raw("12") }
 */
export declare function Raw<T>(value: string): FindOperator<any>;
/**
 * Find Options Operator.
 * Example: { someField: Raw((columnAlias) => `${columnAlias} = 5`) }
 */
export declare function Raw<T>(sqlGenerator: (columnAlias: string) => string): FindOperator<any>;
/**
 * Find Options Operator.
 * For escaping parameters use next syntax:
 * Example: { someField: Raw((columnAlias) => `${columnAlias} = :value`, { value: 5 }) }
 */
export declare function Raw<T>(sqlGenerator: (columnAlias: string) => string, parameters: ObjectLiteral): FindOperator<any>;
