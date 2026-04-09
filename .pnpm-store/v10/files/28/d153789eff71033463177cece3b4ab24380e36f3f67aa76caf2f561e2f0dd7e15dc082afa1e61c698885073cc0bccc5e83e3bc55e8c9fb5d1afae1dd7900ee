/**
 * This utility type forms an object type of `Options` by taking values from
 * `OverrideOptions`. If a value is not defined in `OverrideOptions`, the
 * utility type takes the value from `DefaultOptions`.
 *
 * The utility type intentionally restricts:
 * - `Options` to be required to know the object type form.
 * - `OverrideOptions` to be partial to make empty object assignable to it.
 * - `DefaultOptions` to be required to have fallback values for every property.
 */
export type CreateTypeOptions<
  Options extends Required<Options>,
  OverrideOptions extends Partial<Options>,
  DefaultOptions extends Required<Options>,
> = {
  [Key in keyof Options]: OverrideOptions[Key] extends Options[Key] ? OverrideOptions[Key] : DefaultOptions[Key];
};
