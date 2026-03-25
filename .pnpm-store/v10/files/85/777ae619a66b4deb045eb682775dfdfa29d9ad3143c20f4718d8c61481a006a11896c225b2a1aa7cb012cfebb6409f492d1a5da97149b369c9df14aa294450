import { iterator as Symbol_iterator } from '../symbol/iterator';
import { isFunction } from './isFunction';

/** Identifies an input as being an Iterable */
export function isIterable(input: any): input is Iterable<any> {
  return isFunction(input?.[Symbol_iterator]);
}
