// Copyright (c) 2019, 2025, Oracle and/or its affiliates.

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

const DbObjectImpl = require('./impl/dbObject.js');

class AqMessage {

  //---------------------------------------------------------------------------
  // correlation
  //
  // Property for the correlation used for the message.
  //---------------------------------------------------------------------------
  get correlation() {
    return this._impl.getCorrelation();
  }

  //---------------------------------------------------------------------------
  // delay
  //
  // Property for the delay used for the message.
  //---------------------------------------------------------------------------
  get delay() {
    return this._impl.getDelay();
  }

  //---------------------------------------------------------------------------
  // enqTime
  //
  // Property to indicate the enqueue time for the message.
  //---------------------------------------------------------------------------
  get enqTime() {
    return this._impl.getEnqTime();
  }

  //---------------------------------------------------------------------------
  // deliveryMode
  //
  // Property for the delivery mode used for the message.
  //---------------------------------------------------------------------------
  get deliveryMode() {
    return this._impl.getDeliveryMode();
  }

  //---------------------------------------------------------------------------
  // exceptionQueue
  //
  // Property for the exception queue used for the message.
  //---------------------------------------------------------------------------
  get exceptionQueue() {
    return this._impl.getExceptionQueue();
  }

  //---------------------------------------------------------------------------
  // expiration
  //
  // Property for the expiration used for the message.
  //---------------------------------------------------------------------------
  get expiration() {
    return this._impl.getExpiration();
  }

  //---------------------------------------------------------------------------
  // msgId
  //
  // Property for the message id used for the message.
  //---------------------------------------------------------------------------
  get msgId() {
    return this._impl.getMsgId();
  }

  //---------------------------------------------------------------------------
  // numAttempts
  //
  // Property for the number of attempts used for the message.
  //---------------------------------------------------------------------------
  get numAttempts() {
    return this._impl.getNumAttempts();
  }

  //---------------------------------------------------------------------------
  // originalMsgId
  //
  // Property for the original message id used for the message.
  //---------------------------------------------------------------------------
  get originalMsgId() {
    return this._impl.getOriginalMsgId();
  }

  //---------------------------------------------------------------------------
  // payload
  //
  // Property for the payload used for the message.
  //---------------------------------------------------------------------------
  get payload() {
    const payload = this._impl.getPayload();
    if (payload instanceof DbObjectImpl) {
      const obj = Object.create(this._payloadTypeClass.prototype);
      obj._impl = payload;
      return obj;
    }
    return payload;
  }

  //---------------------------------------------------------------------------
  // priority
  //
  // Property for the priority used for the message.
  //---------------------------------------------------------------------------
  get priority() {
    return this._impl.getPriority();
  }

  //---------------------------------------------------------------------------
  // state
  //
  // Property for the state used for the message.
  //---------------------------------------------------------------------------
  get state() {
    return this._impl.getState();
  }

}

module.exports = AqMessage;
