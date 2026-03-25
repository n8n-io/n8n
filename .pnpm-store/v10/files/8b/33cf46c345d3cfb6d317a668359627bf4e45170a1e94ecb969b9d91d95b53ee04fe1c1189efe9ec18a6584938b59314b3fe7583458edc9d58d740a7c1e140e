import {OrderedMap} from 'immutable';

import {SassList} from './list';
import {Value} from './index';

/**
 * Sass's [map type](https://sass-lang.com/documentation/values/maps).
 *
 * @category Custom Function
 */
export class SassMap extends Value {
  /**
   * Creates a new map.
   *
   * @param contents - The contents of the map. This is an immutable
   * `OrderedMap` from the [`immutable` package](https://immutable-js.com/).
   * Defaults to an empty map.
   */
  constructor(contents?: OrderedMap<Value, Value>);

  /**
   * Returns the contents of this map as an immutable {@link OrderedMap} from the
   * [`immutable` package](https://immutable-js.com/).
   */
  get contents(): OrderedMap<Value, Value>;

  /**
   * Returns the value associated with `key` in this map, or `undefined` if
   * `key` isn't in the map.
   *
   * This is a shorthand for `this.contents.get(key)`, although it may be more
   * efficient in some cases.
   */
  get(key: Value): Value | undefined;

  /** Inherited from {@link Value.get}. */
  get(index: number): SassList | undefined;

  /** @hidden */
  tryMap(): SassMap;
}
