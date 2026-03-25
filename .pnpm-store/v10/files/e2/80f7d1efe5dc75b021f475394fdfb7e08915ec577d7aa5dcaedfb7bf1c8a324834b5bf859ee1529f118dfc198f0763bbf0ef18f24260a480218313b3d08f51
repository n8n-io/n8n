import BaseSchema from './schema';
const Mixed = BaseSchema;
export default Mixed;
export function create() {
  return new Mixed();
} // XXX: this is using the Base schema so that `addMethod(mixed)` works as a base class

create.prototype = Mixed.prototype;