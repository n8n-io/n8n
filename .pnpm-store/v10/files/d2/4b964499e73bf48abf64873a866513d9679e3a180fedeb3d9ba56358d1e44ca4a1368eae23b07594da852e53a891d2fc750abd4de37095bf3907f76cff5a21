import {List} from 'immutable';

import {Value} from './index';

/**
 * Possible separators used by Sass lists. The special separator `null` is only
 * used for lists with fewer than two elements, and indicates that the separator
 * has not yet been decided for this list.
 *
 * @category Custom Function
 */
export type ListSeparator = ',' | '/' | ' ' | null;

/**
 * Sass's [list type](https://sass-lang.com/documentation/values/lists).
 *
 * @category Custom Function
 */
export class SassList extends Value {
  /**
   * Creates a new list.
   *
   * @param contents - The contents of the list. This may be either a plain
   * JavaScript array or an immutable {@link List} from the [`immutable`
   * package](https://immutable-js.com/).
   *
   * @param options.separator - The separator to use between elements of this
   * list. Defaults to `','`.
   *
   * @param options.brackets - Whether the list has square brackets. Defaults to
   * `false`.
   */
  constructor(
    contents: Value[] | List<Value>,
    options?: {
      separator?: ListSeparator;
      brackets?: boolean;
    }
  );

  /**
   * Creates an empty list.
   *
   * @param options.separator - The separator to use between elements of this
   * list. Defaults to `','`.
   *
   * @param options.brackets - Whether the list has square brackets. Defaults to
   * `false`.
   */
  constructor(options?: {separator?: ListSeparator; brackets?: boolean});

  /** @hidden */
  get separator(): ListSeparator;
}
