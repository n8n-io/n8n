import {List, ValueObject} from 'immutable';
import {Value, SassNumber, SassString} from './index';

/**
 * The type of values that can be arguments to a {@link SassCalculation}.
 * @category Custom Function
 * */
export type CalculationValue =
  | SassNumber
  | SassCalculation
  | SassString
  | CalculationOperation
  | CalculationInterpolation;

/**
 * Sass's [calculation
 * type](https://sass-lang.com/documentation/values/calculations).
 *
 * Note: in the JS API calculations are not simplified eagerly. This also means
 * that unsimplified calculations are not equal to the numbers they would be
 * simplified to.
 *
 * @category Custom Function
 */
export class SassCalculation extends Value {
  /**
   * Creates a value that represents `calc(argument)`.
   *
   * @throws `Error` if `argument` is a quoted {@link SassString}
   * @returns A calculation with the name `calc` and `argument` as its single
   * argument.
   */
  static calc(argument: CalculationValue): SassCalculation;

  /**
   * Creates a value that represents `min(arguments...)`.
   *
   * @throws `Error` if `arguments` contains a quoted {@link SassString}
   * @returns A calculation with the name `min` and `arguments` as its
   * arguments.
   */
  static min(
    arguments: CalculationValue[] | List<CalculationValue>
  ): SassCalculation;

  /**
   * Creates a value that represents `max(arguments...)`.
   *
   * @throws `Error` if `arguments` contains a quoted {@link SassString}
   * @returns A calculation with the name `max` and `arguments` as its
   * arguments.
   */
  static max(
    arguments: CalculationValue[] | List<CalculationValue>
  ): SassCalculation;

  /**
   * Creates a value that represents `clamp(value, min, max)`.
   *
   * @throws `Error` if any of `value`, `min`, or `max` are  a quoted
   * {@link SassString}.
   * @throws `Error` if `value` is undefined and `max` is not undefined.
   * @throws `Error` if either `value` or `max` is undefined and neither `min`
     nor `value` is a {@link SassString} or {@link CalculationInterpolation}.
     @returns A calculation with the name `clamp` and `min`, `value`, and `max`
     as it's arguments, excluding any arguments that are undefined.
   */
  static clamp(
    min: CalculationValue,
    value?: CalculationValue,
    max?: CalculationValue
  ): SassCalculation;

  /** Returns the calculation's `name` field. */
  get name(): string;

  /** Returns a list of the calculation's `arguments` */
  get arguments(): List<CalculationValue>;
}

/**
 * The set of possible operators in a Sass calculation.
 * @category Custom Function
 */
export type CalculationOperator = '+' | '-' | '*' | '/';

/**
 * A binary operation that can appear in a {@link SassCalculation}.
 * @category Custom Function
 */
export class CalculationOperation implements ValueObject {
  /**
   * Creates a Sass CalculationOperation with the given `operator`, `left`, and
   * `right` values.
   * @throws `Error` if `left` or `right` are quoted {@link SassString}s.
   */
  constructor(
    operator: CalculationOperator,
    left: CalculationValue,
    right: CalculationValue
  );

  /** Returns the operation's `operator` field. */
  get operator(): CalculationOperator;

  /** Returns the operation's `left` field. */
  get left(): CalculationValue;

  /** Returns the operation's `right` field. */
  get right(): CalculationValue;

  equals(other: unknown): boolean;

  hashCode(): number;
}

/**
 * A string injected into a {@link SassCalculation} using interpolation. Unlike
 * unquoted strings, interpolations are always surrounded in parentheses when
 * they appear in {@link CalculationOperation}s.
 * @category Custom Function
 */
export class CalculationInterpolation implements ValueObject {
  /**
   * Creates a Sass CalculationInterpolation with the given `value`.
   */
  constructor(value: string);

  /**
   * Returns the interpolation's `value` field.
   */
  get value(): string;

  equals(other: unknown): boolean;

  hashCode(): number;
}
