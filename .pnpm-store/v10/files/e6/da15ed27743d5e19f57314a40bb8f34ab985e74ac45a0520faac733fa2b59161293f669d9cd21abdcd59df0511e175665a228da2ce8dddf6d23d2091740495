/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

/**
 * A regexp-tree plugin to translate `/(?<name>a)\k<name>/` to `/(a)\1/`.
 */

module.exports = {
  // To track the names of the groups, and return them
  // in the transform result state.
  //
  // A map from name to number: {foo: 2, bar: 4}
  _groupNames: {},

  /**
   * Initialises the trasnform.
   */
  init: function init() {
    this._groupNames = {};
  },


  /**
   * Returns extra state, which eventually is returned to
   */
  getExtra: function getExtra() {
    return this._groupNames;
  },
  Group: function Group(path) {
    var node = path.node;


    if (!node.name) {
      return;
    }

    // Record group name.
    this._groupNames[node.name] = node.number;

    delete node.name;
    delete node.nameRaw;
  },
  Backreference: function Backreference(path) {
    var node = path.node;


    if (node.kind !== 'name') {
      return;
    }

    node.kind = 'number';
    node.reference = node.number;
    delete node.referenceRaw;
  }
};