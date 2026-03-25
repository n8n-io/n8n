import DbCollection from "./db-collection";
import IdentityManager from "./identity-manager";
import cloneDeep from "lodash/cloneDeep";

/**
  Your Mirage server has a database which you can interact with in your route handlers. You’ll typically use models to interact with your database data, but you can always reach into the db directly in the event you want more control.

  Access the db from your route handlers via `schema.db`.

  You can access individual DbCollections by using `schema.db.name`:

  ```js
  schema.db.users  // would return, e.g., [ { id: 1, name: 'Yehuda' }, { id: 2, name: 'Tom '} ]
  ```

  @class Db
  @constructor
  @public
 */
class Db {
  constructor(initialData, identityManagers) {
    this._collections = [];

    this.registerIdentityManagers(identityManagers);

    if (initialData) {
      this.loadData(initialData);
    }
  }

  /**
    Loads an object of data into Mirage's database.

    The keys of the object correspond to the DbCollections, and the values are arrays of records.

    ```js
    server.db.loadData({
      users: [
        { name: 'Yehuda' },
        { name: 'Tom' }
      ]
    });
    ```

    As with `db.collection.insert`, IDs will automatically be created for records that don't have them.

    @method loadData
    @param {Object} data - Data to load
    @public
   */
  loadData(data) {
    for (let key in data) {
      this.createCollection(key, cloneDeep(data[key]));
    }
  }

  /**
   Logs out the contents of the Db.

   ```js
   server.db.dump() // { users: [ name: 'Yehuda', ...
   ```

   @method dump
   @public
   */
  dump() {
    return this._collections.reduce((data, collection) => {
      data[collection.name] = collection.all();

      return data;
    }, {});
  }

  /**
    Add an empty collection named _name_ to your database. Typically you won’t need to do this yourself, since collections are automatically created for any models you have defined.

    @method createCollection
    @param name
    @param initialData (optional)
    @public
   */
  createCollection(name, initialData) {
    if (!this[name]) {
      let IdentityManager = this.identityManagerFor(name);
      let newCollection = new DbCollection(name, initialData, IdentityManager);

      // Public API has a convenient array interface. It comes at the cost of
      // returning a copy of all records to avoid accidental mutations.
      Object.defineProperty(this, name, {
        get() {
          let recordsCopy = newCollection.all();

          [
            "insert",
            "find",
            "findBy",
            "where",
            "update",
            "remove",
            "firstOrCreate",
          ].forEach(function (method) {
            recordsCopy[method] = function () {
              return newCollection[method](...arguments);
            };
          });

          return recordsCopy;
        },
      });

      // Private API does not have the array interface. This means internally, only
      // db-collection methods can be used. This is so records aren't copied redundantly
      // internally, which leads to accidental O(n^2) operations (e.g., createList).
      Object.defineProperty(this, `_${name}`, {
        get() {
          let recordsCopy = [];

          [
            "insert",
            "find",
            "findBy",
            "where",
            "update",
            "remove",
            "firstOrCreate",
          ].forEach(function (method) {
            recordsCopy[method] = function () {
              return newCollection[method](...arguments);
            };
          });

          return recordsCopy;
        },
      });

      this._collections.push(newCollection);
    } else if (initialData) {
      this[name].insert(initialData);
    }

    return this;
  }

  /**
    @method createCollections
    @param ...collections
    @public
    @hide
   */
  createCollections(...collections) {
    collections.forEach((c) => this.createCollection(c));
  }

  /**
    Removes all data from Mirage's database.

    @method emptyData
    @public
   */
  emptyData() {
    this._collections.forEach((c) => c.remove());
  }

  /**
    @method identityManagerFor
    @param name
    @public
    @hide
   */
  identityManagerFor(name) {
    return (
      this._identityManagers[this._container.inflector.singularize(name)] ||
      this._identityManagers.application ||
      IdentityManager
    );
  }

  /**
    @method registerIdentityManagers
    @public
    @hide
   */
  registerIdentityManagers(identityManagers) {
    this._identityManagers = identityManagers || {};
  }
}

export default Db;
