import type { PropType } from 'vue';
import type { EpProp, EpPropConvert, EpPropFinalized, EpPropInput, EpPropMergeType, IfEpProp, IfNativePropType, NativePropType } from './types';
export declare const epPropKey = "__epPropKey";
export declare const definePropType: <T>(val: any) => PropType<T>;
export declare const isEpProp: (val: unknown) => val is EpProp<any, any, any>;
/**
 * @description Build prop. It can better optimize prop types
 * @description 生成 prop，能更好地优化类型
 * @example
  // limited options
  // the type will be PropType<'light' | 'dark'>
  buildProp({
    type: String,
    values: ['light', 'dark'],
  } as const)
  * @example
  // limited options and other types
  // the type will be PropType<'small' | 'large' | number>
  buildProp({
    type: [String, Number],
    values: ['small', 'large'],
    validator: (val: unknown): val is number => typeof val === 'number',
  } as const)
  @link see more: https://github.com/element-plus/element-plus/pull/3341
 */
export declare const buildProp: <Type = never, Value = never, Validator = never, Default extends EpPropMergeType<Type, Value, Validator> = never, Required_1 extends boolean = false>(prop: EpPropInput<Type, Value, Validator, Default, Required_1>, key?: string | undefined) => EpPropFinalized<Type, Value, Validator, Default, Required_1>;
export declare const buildProps: <Props extends Record<string, {
    __epPropKey: true;
} | NativePropType | EpPropInput<any, any, any, any, any>>>(props: Props) => { [K in keyof Props]: IfEpProp<Props[K], Props[K], IfNativePropType<Props[K], Props[K], EpPropConvert<Props[K]>>>; };
