import type { FieldRules as _validate_FieldRules, FieldRules__Output as _validate_FieldRules__Output } from '../validate/FieldRules';
import type { Long } from '@grpc/proto-loader';
/**
 * RepeatedRules describe the constraints applied to `repeated` values
 */
export interface RepeatedRules {
    /**
     * MinItems specifies that this field must have the specified number of
     * items at a minimum
     */
    'min_items'?: (number | string | Long);
    /**
     * MaxItems specifies that this field must have the specified number of
     * items at a maximum
     */
    'max_items'?: (number | string | Long);
    /**
     * Unique specifies that all elements in this field must be unique. This
     * contraint is only applicable to scalar and enum types (messages are not
     * supported).
     */
    'unique'?: (boolean);
    /**
     * Items specifies the contraints to be applied to each item in the field.
     * Repeated message fields will still execute validation against each item
     * unless skip is specified here.
     */
    'items'?: (_validate_FieldRules | null);
}
/**
 * RepeatedRules describe the constraints applied to `repeated` values
 */
export interface RepeatedRules__Output {
    /**
     * MinItems specifies that this field must have the specified number of
     * items at a minimum
     */
    'min_items': (string);
    /**
     * MaxItems specifies that this field must have the specified number of
     * items at a maximum
     */
    'max_items': (string);
    /**
     * Unique specifies that all elements in this field must be unique. This
     * contraint is only applicable to scalar and enum types (messages are not
     * supported).
     */
    'unique': (boolean);
    /**
     * Items specifies the contraints to be applied to each item in the field.
     * Repeated message fields will still execute validation against each item
     * unless skip is specified here.
     */
    'items': (_validate_FieldRules__Output | null);
}
