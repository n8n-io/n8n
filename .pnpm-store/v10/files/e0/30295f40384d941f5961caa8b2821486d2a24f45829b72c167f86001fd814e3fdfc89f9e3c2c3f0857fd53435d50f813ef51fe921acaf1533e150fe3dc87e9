// Copyright (c) 2019, 2023, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

const { Buffer } = require('buffer');
const constants = require('./constants.js');
const errors = require('./errors.js');

class AqDeqOptions {

  //---------------------------------------------------------------------------
  // condition
  //
  // Property for the condition to use for dequeuing messages.
  //---------------------------------------------------------------------------
  get condition() {
    return this._impl.getCondition();
  }

  set condition(value) {
    errors.assertPropValue(typeof value === 'string', "condition");
    this._impl.setCondition(value);
  }

  //---------------------------------------------------------------------------
  // consumerName
  //
  // Property for the consumer name to use for dequeuing messages.
  //---------------------------------------------------------------------------
  get consumerName() {
    return this._impl.getConsumerName();
  }

  set consumerName(value) {
    errors.assertPropValue(typeof value === 'string', "consumerName");
    this._impl.setConsumerName(value);
  }

  //---------------------------------------------------------------------------
  // correlation
  //
  // Property for the correlation to use for dequeuing messages.
  //---------------------------------------------------------------------------
  get correlation() {
    return this._impl.getCorrelation();
  }

  set correlation(value) {
    errors.assertPropValue(typeof value === 'string', "correlation");
    this._impl.setCorrelation(value);
  }

  //---------------------------------------------------------------------------
  // mode
  //
  // Property for the mode to use for dequeuing messages.
  //---------------------------------------------------------------------------
  get mode() {
    return this._impl.getMode();
  }

  set mode(value) {
    errors.assertPropValue(value === constants.AQ_DEQ_MODE_BROWSE ||
      value === constants.AQ_DEQ_MODE_LOCKED ||
      value === constants.AQ_DEQ_MODE_REMOVE ||
      value === constants.AQ_DEQ_MODE_REMOVE_NO_DATA, "mode");
    this._impl.setMode(value);
  }

  //---------------------------------------------------------------------------
  // msgId
  //
  // Property for the message id to use for dequeuing messages.
  //---------------------------------------------------------------------------
  get msgId() {
    return this._impl.getMsgId();
  }

  set msgId(value) {
    errors.assertPropValue(Buffer.isBuffer(value), "msgId");
    this._impl.setMsgId(value);
  }

  //---------------------------------------------------------------------------
  // navigation
  //
  // Property for the navigation to use for dequeuing messages.
  //---------------------------------------------------------------------------
  get navigation() {
    return this._impl.getNavigation();
  }

  set navigation(value) {
    errors.assertPropValue(value === constants.AQ_DEQ_NAV_FIRST_MSG ||
        value === constants.AQ_DEQ_NAV_NEXT_TRANSACTION ||
        value === constants.AQ_DEQ_NAV_NEXT_MSG, "navigation");
    this._impl.setNavigation(value);
  }

  //---------------------------------------------------------------------------
  // transformation
  //
  // Property for the transformation to use for dequeuing messages.
  //---------------------------------------------------------------------------
  get transformation() {
    return this._impl.getTransformation();
  }

  set transformation(value) {
    errors.assertPropValue(typeof value === 'string', "transformation");
    this._impl.setTransformation(value);
  }

  //---------------------------------------------------------------------------
  // visibility
  //
  // Property for the visibility to use for dequeuing messages.
  //---------------------------------------------------------------------------
  get visibility() {
    return this._impl.getVisibility();
  }

  set visibility(value) {
    errors.assertPropValue(value === constants.AQ_VISIBILITY_IMMEDIATE ||
      value === constants.AQ_VISIBILITY_ON_COMMIT, "visibility");
    this._impl.setVisibility(value);
  }

  //---------------------------------------------------------------------------
  // wait
  //
  // Property for the time to wait for dequeuing messages.
  //---------------------------------------------------------------------------
  get wait() {
    return this._impl.getWait();
  }

  set wait(value) {
    errors.assertPropValue(Number.isInteger(value) && value >= 0, "wait");
    this._impl.setWait(value);
  }

}

module.exports = AqDeqOptions;
