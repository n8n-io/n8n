function isNumber(n) {
  return (+n).toString() === n.toString();
}

/**
  By default Mirage uses autoincrementing numbers starting with `1` as IDs for records. This can be customized by implementing one or more IdentityManagers for your application.

  An IdentityManager is a class that's responsible for generating unique identifiers. You can define a custom identity manager for your entire application, as well as on a per-model basis.

  A custom IdentityManager must implement these methods:

  - `fetch`, which must return an identifier not yet used
  - `set`, which is called with an `id` of a record being insert into Mirage's database
  - `reset`, which should reset database to initial state

  Check out the advanced guide on Mocking UUIDs to see a complete example of a custom IdentityManager.

  @class IdentityManager
  @constructor
  @public
*/
class IdentityManager {
  constructor() {
    this._nextId = 1;
    this._ids = {};
  }

  /**
    @method get
    @hide
    @private
  */
  get() {
    return this._nextId;
  }

  /**
    Registers `uniqueIdentifier` as used.

    This method should throw is `uniqueIdentifier` has already been taken.

    @method set
    @param {String|Number} uniqueIdentifier
    @public
  */
  set(uniqueIdentifier) {
    if (this._ids[uniqueIdentifier]) {
      throw new Error(
        `Attempting to use the ID ${uniqueIdentifier}, but it's already been used`
      );
    }

    if (isNumber(uniqueIdentifier) && +uniqueIdentifier >= this._nextId) {
      this._nextId = +uniqueIdentifier + 1;
    }

    this._ids[uniqueIdentifier] = true;
  }

  /**
    @method inc
    @hide
    @private
  */
  inc() {
    let nextValue = this.get() + 1;

    this._nextId = nextValue;

    return nextValue;
  }

  /**
    Returns the next unique identifier.

    @method fetch
    @return {String} Unique identifier
    @public
  */
  fetch() {
    let id = this.get();

    this._ids[id] = true;

    this.inc();

    return id.toString();
  }

  /**
    Resets the identity manager, marking all unique identifiers as available.

    @method reset
    @public
  */
  reset() {
    this._nextId = 1;
    this._ids = {};
  }
}

export default IdentityManager;
