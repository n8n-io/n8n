import {List, OrderedMap} from 'immutable';

import {Value} from './index';
import {SassList, ListSeparator} from './list';

/**
 * Sass's [argument list
 * type](https://sass-lang.com/documentation/values/lists#argument-lists).
 *
 * An argument list comes from a rest argument. It's distinct from a normal
 * {@link SassList} in that it may contain a keyword map as well as the
 * positional arguments.
 *
 * @category Custom Function
 */
export class SassArgumentList extends SassList {
  /**
   * Creates a new argument list.
   *
   * @param contents - The positional arguments that make up the primary
   * contents of the list. This may be either a plain JavaScript array or an
   * immutable {@link List} from the [`immutable`
   * package](https://immutable-js.com/).
   *
   * @param keywords - The keyword arguments attached to this argument list,
   * whose names should exclude `$`. This can be either a plain JavaScript
   * object with argument names as fields, or an immutable {@link OrderedMap}
   * from the [`immutable` package](https://immutable-js.com/)
   *
   * @param separator - The separator for this list. Defaults to `','`.
   */
  constructor(
    contents: Value[] | List<Value>,
    keywords: Record<string, Value> | OrderedMap<string, Value>,
    separator?: ListSeparator
  );

  /**
   * The keyword arguments attached to this argument list.
   *
   * The argument names don't include `$`.
   *
   * @returns An immutable {@link OrderedMap} from the [`immutable`
   * package](https://immutable-js.com/).
   */
  get keywords(): OrderedMap<string, Value>;
}
