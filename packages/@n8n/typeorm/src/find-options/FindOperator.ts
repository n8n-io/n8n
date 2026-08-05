import { ObjectLiteral } from '../common/ObjectLiteral';
import { FindOperatorType } from './FindOperatorType';
import { InstanceChecker } from '../util/InstanceChecker';
import { ValueTransformer } from '../decorator/options/ValueTransformer';
import { ApplyValueTransformers } from '../util/ApplyValueTransformers';

type SqlGeneratorType = (aliasPath: string) => string;

/**
 * Find Operator used in Find Conditions.
 */
export class FindOperator<T> {
	readonly '@instanceof' = Symbol.for('FindOperator');

	// -------------------------------------------------------------------------
	// Private Properties
	// -------------------------------------------------------------------------

	/**
	 * Operator type.
	 */
	private _type: FindOperatorType;

	/**
	 * Parameter value.
	 */
	private _value: T | FindOperator<T>;

	/**
	 * ObjectLiteral parameters.
	 */
	private _objectLiteralParameters: ObjectLiteral | undefined;

	/**
	 * Indicates if parameter is used or not for this operator.
	 */
	private _useParameter: boolean;

	/**
	 * Indicates if multiple parameters must be used for this operator.
	 */
	private _multipleParameters: boolean;

	/**
	 * SQL generator
	 */
	private _getSql: SqlGeneratorType | undefined;

	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor(
		type: FindOperatorType,
		value: T | FindOperator<T>,
		useParameter: boolean = true,
		multipleParameters: boolean = false,
		getSql?: SqlGeneratorType,
		objectLiteralParameters?: ObjectLiteral,
	) {
		this._type = type;
		this._value = value;
		this._useParameter = useParameter;
		this._multipleParameters = multipleParameters;
		this._getSql = getSql;
		this._objectLiteralParameters = objectLiteralParameters;
	}

	// -------------------------------------------------------------------------
	// Accessors
	// -------------------------------------------------------------------------

	/**
	 * Indicates if parameter is used or not for this operator.
	 * Extracts final value if value is another find operator.
	 */
	get useParameter(): boolean {
		if (InstanceChecker.isFindOperator(this._value)) return this._value.useParameter;

		return this._useParameter;
	}

	/**
	 * Indicates if multiple parameters must be used for this operator.
	 * Extracts final value if value is another find operator.
	 */
	get multipleParameters(): boolean {
		if (InstanceChecker.isFindOperator(this._value)) return this._value.multipleParameters;

		return this._multipleParameters;
	}

	/**
	 * Gets the Type of this FindOperator
	 */
	get type(): FindOperatorType {
		return this._type;
	}

	/**
	 * Gets the final value needs to be used as parameter value.
	 */
	get value(): T {
		if (InstanceChecker.isFindOperator(this._value)) return this._value.value;

		return this._value;
	}

	/**
	 * Gets ObjectLiteral parameters.
	 */
	get objectLiteralParameters(): ObjectLiteral | undefined {
		if (InstanceChecker.isFindOperator(this._value)) return this._value.objectLiteralParameters;

		return this._objectLiteralParameters;
	}

	/**
	 * Gets the child FindOperator if it exists
	 */
	get child(): FindOperator<T> | undefined {
		if (InstanceChecker.isFindOperator(this._value)) return this._value;

		return undefined;
	}

	/**
	 * Gets the SQL generator
	 */
	get getSql(): SqlGeneratorType | undefined {
		if (InstanceChecker.isFindOperator(this._value)) return this._value.getSql;

		return this._getSql;
	}

	transformValue(transformer: ValueTransformer | ValueTransformer[]) {
		if (this._value instanceof FindOperator) {
			this._value.transformValue(transformer);
		} else {
			this._value =
				Array.isArray(this._value) && this._multipleParameters
					? this._value.map(
							(v: any) => transformer && ApplyValueTransformers.transformTo(transformer, v),
						)
					: ApplyValueTransformers.transformTo(transformer, this._value);
		}
	}
}
