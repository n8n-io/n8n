import type { Long } from '@grpc/proto-loader';
/**
 * Fixed64Rules describes the constraints applied to `fixed64` values
 */
export interface Fixed64Rules {
    /**
     * Const specifies that this field must be exactly the specified value
     */
    'const'?: (number | string | Long);
    /**
     * Lt specifies that this field must be less than the specified value,
     * exclusive
     */
    'lt'?: (number | string | Long);
    /**
     * Lte specifies that this field must be less than or equal to the
     * specified value, inclusive
     */
    'lte'?: (number | string | Long);
    /**
     * Gt specifies that this field must be greater than the specified value,
     * exclusive. If the value of Gt is larger than a specified Lt or Lte, the
     * range is reversed.
     */
    'gt'?: (number | string | Long);
    /**
     * Gte specifies that this field must be greater than or equal to the
     * specified value, inclusive. If the value of Gte is larger than a
     * specified Lt or Lte, the range is reversed.
     */
    'gte'?: (number | string | Long);
    /**
     * In specifies that this field must be equal to one of the specified
     * values
     */
    'in'?: (number | string | Long)[];
    /**
     * NotIn specifies that this field cannot be equal to one of the specified
     * values
     */
    'not_in'?: (number | string | Long)[];
}
/**
 * Fixed64Rules describes the constraints applied to `fixed64` values
 */
export interface Fixed64Rules__Output {
    /**
     * Const specifies that this field must be exactly the specified value
     */
    'const': (string);
    /**
     * Lt specifies that this field must be less than the specified value,
     * exclusive
     */
    'lt': (string);
    /**
     * Lte specifies that this field must be less than or equal to the
     * specified value, inclusive
     */
    'lte': (string);
    /**
     * Gt specifies that this field must be greater than the specified value,
     * exclusive. If the value of Gt is larger than a specified Lt or Lte, the
     * range is reversed.
     */
    'gt': (string);
    /**
     * Gte specifies that this field must be greater than or equal to the
     * specified value, inclusive. If the value of Gte is larger than a
     * specified Lt or Lte, the range is reversed.
     */
    'gte': (string);
    /**
     * In specifies that this field must be equal to one of the specified
     * values
     */
    'in': (string)[];
    /**
     * NotIn specifies that this field cannot be equal to one of the specified
     * values
     */
    'not_in': (string)[];
}
