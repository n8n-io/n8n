'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.default = void 0;
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/*
 * This file exports a set of constants that are used for Jest's haste map
 * serialization. On very large repositories, the haste map cache becomes very
 * large to the point where it is the largest overhead in starting up Jest.
 *
 * This constant key map allows to keep the map smaller without having to build
 * a custom serialization library.
 */

/* eslint-disable sort-keys */
const constants = {
  /* dependency serialization */
  DEPENDENCY_DELIM: '\0',
  /* file map attributes */
  ID: 0,
  MTIME: 1,
  SIZE: 2,
  VISITED: 3,
  DEPENDENCIES: 4,
  SHA1: 5,
  /* module map attributes */
  PATH: 0,
  TYPE: 1,
  /* module types */
  MODULE: 0,
  PACKAGE: 1,
  /* platforms */
  GENERIC_PLATFORM: 'g',
  NATIVE_PLATFORM: 'native'
};
/* eslint-enable */
var _default = constants;
exports.default = _default;
