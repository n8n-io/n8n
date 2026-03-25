import isEqual from "lodash/isEqual";
import map from "lodash/map";

function duplicate(data) {
  if (Array.isArray(data)) {
    return data.map(duplicate);
  } else {
    return Object.assign({}, data);
  }
}

/**
  Mirage's `Db` has many `DbCollections`, which are equivalent to tables from traditional databases. They store specific types of data, for example `users` and `posts`.

  `DbCollections` have names, like `users`, which you use to access the collection from the `Db` object.

  Suppose you had a `user` model defined, and the following data had been inserted into your database (either through factories or fixtures):

  ```js
  export default [
    { id: 1, name: 'Zelda' },
    { id: 2, name: 'Link' }
  ];
  ```

  Then `db.contacts` would return this array.

  @class DbCollection
  @constructor
  @public
 */
class DbCollection {
  constructor(name, initialData, IdentityManager) {
    this.name = name;
    this._records = [];
    this.identityManager = new IdentityManager();

    if (initialData) {
      this.insert(initialData);
    }
  }

  /**
   * Returns a copy of the data, to prevent inadvertent data manipulation.
   * @method all
   * @public
   * @hide
   */
  all() {
    return duplicate(this._records);
  }

  /**
    Inserts `data` into the collection. `data` can be a single object
    or an array of objects. Returns the inserted record.

    ```js
    // Insert a single record
    let link = db.users.insert({ name: 'Link', age: 173 });

    link;  // { id: 1, name: 'Link', age: 173 }

    // Insert an array
    let users = db.users.insert([
      { name: 'Zelda', age: 142 },
      { name: 'Epona', age: 58 },
    ]);

    users;  // [ { id: 2, name: 'Zelda', age: 142 }, { id: 3, name: 'Epona', age: 58 } ]
    ```

    @method insert
    @param data
    @public
   */
  insert(data) {
    if (!Array.isArray(data)) {
      return this._insertRecord(data);
    } else {
      return map(data, (attrs) => this._insertRecord(attrs));
    }
  }

  /**
    Returns a single record from the `collection` if `ids` is a single
    id, or an array of records if `ids` is an array of ids. Note
    each id can be an int or a string, but integer ids as strings
    (e.g. the string “1”) will be treated as integers.

    ```js
    // Given users = [{id: 1, name: 'Link'}, {id: 2, name: 'Zelda'}]

    db.users.find(1);      // {id: 1, name: 'Link'}
    db.users.find([1, 2]); // [{id: 1, name: 'Link'}, {id: 2, name: 'Zelda'}]
    ```

    @method find
    @param ids
    @public
   */
  find(ids) {
    if (Array.isArray(ids)) {
      let records = this._findRecords(ids).filter(Boolean).map(duplicate); // Return a copy

      return records;
    } else {
      let record = this._findRecord(ids);
      if (!record) {
        return null;
      }

      // Return a copy
      return duplicate(record);
    }
  }

  /**
    Returns the first model from `collection` that matches the
    key-value pairs in the `query` object. Note that a string
    comparison is used. `query` is a POJO.

    ```js
    // Given users = [ { id: 1, name: 'Link' }, { id: 2, name: 'Zelda' } ]
    db.users.findBy({ name: 'Link' }); // { id: 1, name: 'Link' }
    ```

    @method find
    @param query
    @public
   */
  findBy(query) {
    let record = this._findRecordBy(query);
    if (!record) {
      return null;
    }

    // Return a copy
    return duplicate(record);
  }

  /**
    Returns an array of models from `collection` that match the
    key-value pairs in the `query` object. Note that a string
    comparison is used. `query` is a POJO.

    ```js
    // Given users = [ { id: 1, name: 'Link' }, { id: 2, name: 'Zelda' } ]

    db.users.where({ name: 'Zelda' }); // [ { id: 2, name: 'Zelda' } ]
    ```

    @method where
    @param query
    @public
   */
  where(query) {
    return this._findRecordsWhere(query).map(duplicate);
  }

  /**
    Finds the first record matching the provided _query_ in
    `collection`, or creates a new record using a merge of the
    `query` and optional `attributesForCreate`.

    Often times you may have a pattern like the following in your API stub:

    ```js
    // Given users = [
    //   { id: 1, name: 'Link' },
    //   { id: 2, name: 'Zelda' }
    // ]

    // Create Link if he doesn't yet exist
    let records = db.users.where({ name: 'Link' });
    let record;

    if (records.length > 0) {
      record = records[0];
    } else {
      record = db.users.insert({ name: 'Link' });
    }
    ```

    You can now replace this with the following:

    ```js
    let record = db.users.firstOrCreate({ name: 'Link' });
    ```

    An extended example using *attributesForCreate*:

    ```js
    let record = db.users.firstOrCreate({ name: 'Link' }, { evil: false });
    ```

    @method firstOrCreate
    @param query
    @param attributesForCreate
    @public
   */
  firstOrCreate(query, attributesForCreate = {}) {
    let queryResult = this.where(query);
    let [record] = queryResult;

    if (record) {
      return record;
    } else {
      let mergedAttributes = Object.assign(attributesForCreate, query);
      let createdRecord = this.insert(mergedAttributes);

      return createdRecord;
    }
  }

  /**
    Updates one or more records in the collection.

    If *attrs* is the only arg present, updates all records in the collection according to the key-value pairs in *attrs*.

    If *target* is present, restricts updates to those that match *target*. If *target* is a number or string, finds a single record whose id is *target* to update. If *target* is a POJO, queries *collection* for records that match the key-value pairs in *target*, and updates their *attrs*.

    Returns the updated record or records.

    ```js
    // Given users = [
    //   {id: 1, name: 'Link'},
    //   {id: 2, name: 'Zelda'}
    // ]

    db.users.update({name: 'Ganon'}); // db.users = [{id: 1, name: 'Ganon'}, {id: 2, name: 'Ganon'}]
    db.users.update(1, {name: 'Young Link'}); // db.users = [{id: 1, name: 'Young Link'}, {id: 2, name: 'Zelda'}]
    db.users.update({name: 'Link'}, {name: 'Epona'}); // db.users = [{id: 1, name: 'Epona'}, {id: 2, name: 'Zelda'}]
    ```

    @method update
    @param target
    @param attrs
    @public
   */
  update(target, attrs) {
    let records;

    if (typeof attrs === "undefined") {
      attrs = target;
      let changedRecords = [];

      this._records.forEach((record) => {
        let oldRecord = Object.assign({}, record);

        this._updateRecord(record, attrs);

        if (!isEqual(oldRecord, record)) {
          changedRecords.push(record);
        }
      });

      return changedRecords;
    } else if (typeof target === "number" || typeof target === "string") {
      let id = target;
      let record = this._findRecord(id);

      this._updateRecord(record, attrs);

      return record;
    } else if (Array.isArray(target)) {
      let ids = target;
      records = this._findRecords(ids);

      records.forEach((record) => {
        this._updateRecord(record, attrs);
      });

      return records;
    } else if (typeof target === "object") {
      let query = target;
      records = this._findRecordsWhere(query);

      records.forEach((record) => {
        this._updateRecord(record, attrs);
      });

      return records;
    }
  }

  /**
    Removes one or more records in *collection*.

    If *target* is undefined, removes all records. If *target* is a number or string, removes a single record using *target* as id. If *target* is a POJO, queries *collection* for records that match the key-value pairs in *target*, and removes them from the collection.

    ```js
    // Given users = [
    //   {id: 1, name: 'Link'},
    //   {id: 2, name: 'Zelda'}
    // ]

    db.users.remove(); // db.users = []
    db.users.remove(1); // db.users = [{id: 2, name: 'Zelda'}]
    db.users.remove({name: 'Zelda'}); // db.users = [{id: 1, name: 'Link'}]
    ```

    @method remove
    @param target
    @public
   */
  remove(target) {
    let records;

    if (typeof target === "undefined") {
      this._records = [];
      this.identityManager.reset();
    } else if (typeof target === "number" || typeof target === "string") {
      let record = this._findRecord(target);
      let index = this._records.indexOf(record);
      this._records.splice(index, 1);
    } else if (Array.isArray(target)) {
      records = this._findRecords(target);
      records.forEach((record) => {
        let index = this._records.indexOf(record);
        this._records.splice(index, 1);
      });
    } else if (typeof target === "object") {
      records = this._findRecordsWhere(target);
      records.forEach((record) => {
        let index = this._records.indexOf(record);
        this._records.splice(index, 1);
      });
    }
  }

  /*
    Private methods.

    These return the actual db objects, whereas the public
    API query methods return copies.
  */

  /**
    @method _findRecord
    @param id
    @private
    @hide
   */
  _findRecord(id) {
    id = id.toString();

    return this._records.find((obj) => obj.id === id);
  }

  /**
    @method _findRecordBy
    @param query
    @private
    @hide
   */
  _findRecordBy(query) {
    return this._findRecordsWhere(query)[0];
  }

  /**
    @method _findRecords
    @param ids
    @private
    @hide
   */
  _findRecords(ids) {
    return ids.map(this._findRecord, this);
  }

  /**
    @method _findRecordsWhere
    @param query
    @private
    @hide
   */
  _findRecordsWhere(query) {
    let records = this._records;

    function defaultQueryFunction(record) {
      let keys = Object.keys(query);

      return keys.every(function (key) {
        return String(record[key]) === String(query[key]);
      });
    }

    let queryFunction =
      typeof query === "object" ? defaultQueryFunction : query;

    return records.filter(queryFunction);
  }

  /**
    @method _insertRecord
    @param data
    @private
    @hide
   */
  _insertRecord(data) {
    let attrs = duplicate(data);

    if (attrs && (attrs.id === undefined || attrs.id === null)) {
      attrs.id = this.identityManager.fetch(attrs);
    } else {
      attrs.id = attrs.id.toString();

      this.identityManager.set(attrs.id);
    }

    this._records.push(attrs);

    return duplicate(attrs);
  }

  /**
    @method _updateRecord
    @param record
    @param attrs
    @private
    @hide
   */
  _updateRecord(record, attrs) {
    let targetId =
      attrs && Object.prototype.hasOwnProperty.call(attrs, "id")
        ? attrs.id.toString()
        : null;
    let currentId = record.id;

    if (targetId && currentId !== targetId) {
      throw new Error("Updating the ID of a record is not permitted");
    }

    for (let attr in attrs) {
      if (attr === "id") {
        continue;
      }

      record[attr] = attrs[attr];
    }
  }
}

export default DbCollection;
