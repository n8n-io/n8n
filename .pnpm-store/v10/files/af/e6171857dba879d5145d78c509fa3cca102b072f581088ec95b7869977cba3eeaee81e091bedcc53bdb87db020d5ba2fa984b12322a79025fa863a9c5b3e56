// Copyright (c) 2019, 2024, Oracle and/or its affiliates.

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
const errors = require('./errors.js');
const nodbUtil = require('./util.js');
const AqDeqOptions = require('./aqDeqOptions.js');
const AqEnqOptions = require('./aqEnqOptions.js');
const AqMessage = require('./aqMessage.js');
const BaseDbObject = require('./dbObject.js');
const transformer = require('./transformer.js');
const types = require('./types.js');

class AqQueue {

  //---------------------------------------------------------------------------
  // _isPayload()
  //
  // Returns a boolean indicating if the value is a valid payload.
  //---------------------------------------------------------------------------
  _isPayload(value) {
    return (typeof value === 'string' || Buffer.isBuffer(value) ||
        value instanceof BaseDbObject);
  }

  //---------------------------------------------------------------------------
  // _makeMessage()
  //
  // For enqOne()/deqOne()/enqMany()/deqMany(), wrap the return value with JS
  // layer object.
  //---------------------------------------------------------------------------
  _makeMessage(msgImpl) {
    const msg = new AqMessage();
    msg._impl = msgImpl;
    msg._payloadTypeClass = this._payloadTypeClass;
    return msg;
  }

  //---------------------------------------------------------------------------
  // _verifyMessage()
  //
  // Messages that can be enqueued must be a string, Buffer or database object
  // (in which case all message properties are defaulted) or an object
  // containing a "payload" property along with the other properties to use
  // during the enqueue. A normalized object is returned.
  //---------------------------------------------------------------------------
  _verifyMessage(message) {

    // validate we have a payload of the correct type
    let payload;
    if (this._isPayload(message)) {
      payload = message;
      message = {};
    } else {
      message = {...message};
      if (this._isJson || this._isPayload(message.payload)) {
        payload = message.payload;
      } else if (this._payloadTypeClass) {
        payload = new this._payloadTypeClass(message.payload);
      } else {
        errors.throwErr(errors.ERR_INVALID_AQ_MESSAGE);
      }
    }

    // validate payload
    if (this._isJson) {
      message.payload = transformer.transformJsonValue(payload);
    } else if (typeof payload === 'string') {
      message.payload = Buffer.from(payload);
    } else if (Buffer.isBuffer(payload)) {
      message.payload = payload;
    } else {
      message.payload = payload._impl;
    }

    // validate options, if applicable
    if (message.correlation !== undefined) {
      errors.assertParamPropValue(typeof message.correlation === 'string', 1,
        "correlation");
    }
    if (message.delay !== undefined) {
      errors.assertParamPropValue(Number.isInteger(message.delay), 1, "delay");
    }
    if (message.exceptionQueue !== undefined) {
      errors.assertParamPropValue(typeof message.exceptionQueue === 'string',
        1, "exceptionQueue");
    }
    if (message.expiration !== undefined) {
      errors.assertParamPropValue(Number.isInteger(message.expiration), 1,
        "expiration");
    }
    if (message.priority !== undefined) {
      errors.assertParamPropValue(Number.isInteger(message.priority), 1,
        "priority");
    }
    if (message.recipients !== undefined) {
      errors.assertParamPropValue(nodbUtil.isArrayOfStrings(message.recipients),
        1, "recipients");
    }

    return message;
  }

  //---------------------------------------------------------------------------
  // create()
  //
  // Creates the queue and populates some internal attributes.
  //---------------------------------------------------------------------------
  async create(conn, name, options) {
    if (options.payloadType === types.DB_TYPE_JSON) {
      this._isJson = true;
      this._payloadType = types.DB_TYPE_JSON;
      this._payloadTypeName = "JSON";
    } else if (options.payloadType === undefined ||
               options.payloadType === types.DB_TYPE_RAW) {
      this._payloadType = types.DB_TYPE_RAW;
      this._payloadTypeName = "RAW";
    } else {
      if (typeof options.payloadType === 'string') {
        // DB Object type
        const cls = await conn._getDbObjectClassForName(options.payloadType);
        this._payloadTypeClass = cls;
        options.payloadType = cls;
      } else {
        errors.assertParamPropValue(nodbUtil.isObject(options.payloadType) &&
          options.payloadType.prototype instanceof BaseDbObject, 2, "payloadType");
        this._payloadTypeClass = options.payloadType;
      }
      this._payloadType = types.DB_TYPE_OBJECT;
      this._payloadTypeName = this._payloadTypeClass.prototype.name;
    }
    this._name = name;
    this._impl = await conn._impl.getQueue(name, this._payloadTypeClass,
      this._payloadType);
  }

  //---------------------------------------------------------------------------
  // deqMany()
  //
  // Returns an array of messages from the queue, up to the maximum specified,
  // if any are available.
  //---------------------------------------------------------------------------
  async deqMany(maxMessages) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(Number.isInteger(maxMessages) && maxMessages > 0,
      1);
    const msgImpls = await this._impl.deq(maxMessages);
    return  msgImpls.map(i => this._makeMessage(i));
  }

  //---------------------------------------------------------------------------
  // deqOne()
  //
  // Returns a single message from the queue, if one is available.
  //---------------------------------------------------------------------------
  async deqOne() {
    errors.assertArgCount(arguments, 0, 0);
    const msgImpls = await this._impl.deq(1);
    if (msgImpls.length > 0)
      return this._makeMessage(msgImpls[0]);
  }

  //---------------------------------------------------------------------------
  // deqOptions
  //
  // Property for the dequeue options associated with the queue.
  //---------------------------------------------------------------------------
  get deqOptions() {
    if (!this._deqOptions) {
      const deqOptions = new AqDeqOptions();
      deqOptions._impl = this._impl.deqOptions;
      this._deqOptions = deqOptions;
    }
    return this._deqOptions;
  }

  //---------------------------------------------------------------------------
  // enqMany()
  //
  // Enqueues multiple messages into the queue at the same time, avoiding
  // multiple round-trips.
  //---------------------------------------------------------------------------
  async enqMany(messages) {
    errors.assertArgCount(arguments, 1, 1);
    errors.assertParamValue(Array.isArray(messages) && messages.length > 0, 1);
    const verifiedMessages = new Array(messages.length);
    for (let i = 0; i < messages.length; i++) {
      verifiedMessages[i] = this._verifyMessage(messages[i]);
    }
    const msgImpls = await this._impl.enq(verifiedMessages);
    return msgImpls.map(i => this._makeMessage(i));
  }

  //---------------------------------------------------------------------------
  // enqOne()
  //
  // Enqueues a single message into the queue.
  //---------------------------------------------------------------------------
  async enqOne(message) {
    errors.assertArgCount(arguments, 1, 1);
    message = this._verifyMessage(message);
    const msgImpls = await this._impl.enq([message]);
    return this._makeMessage(msgImpls[0]);
  }

  //---------------------------------------------------------------------------
  // enqOptions
  //
  // Property for the enqueue options associated with the queue.
  //---------------------------------------------------------------------------
  get enqOptions() {
    if (!this._enqOptions) {
      const enqOptions = new AqEnqOptions();
      enqOptions._impl = this._impl.enqOptions;
      this._enqOptions = enqOptions;
    }
    return this._enqOptions;
  }

  //---------------------------------------------------------------------------
  // name
  //
  // Property for the name of the queue.
  //---------------------------------------------------------------------------
  get name() {
    return this._name;
  }

  //---------------------------------------------------------------------------
  // payloadType
  //
  // Property for the payload type.
  //---------------------------------------------------------------------------
  get payloadType() {
    return this._payloadType;
  }

  //---------------------------------------------------------------------------
  // payloadTypeName
  //
  // Property for the payload type name.
  //---------------------------------------------------------------------------
  get payloadTypeName() {
    return this._payloadTypeName;
  }

  //---------------------------------------------------------------------------
  // payloadTypeClass
  //
  // Property for the payload type class.
  //---------------------------------------------------------------------------
  get payloadTypeClass() {
    return this._payloadTypeClass;
  }

}

nodbUtil.wrapFns(AqQueue.prototype,
  "deqOne",
  "deqMany",
  "enqOne",
  "enqMany");

module.exports = AqQueue;
