import baseCreate from './_baseCreate.js';
import extendOwn from './extendOwn.js';

// Creates an object that inherits from the given prototype object.
// If additional properties are provided then they will be added to the
// created object.
export default function create(prototype, props) {
  var result = baseCreate(prototype);
  if (props) extendOwn(result, props);
  return result;
}
