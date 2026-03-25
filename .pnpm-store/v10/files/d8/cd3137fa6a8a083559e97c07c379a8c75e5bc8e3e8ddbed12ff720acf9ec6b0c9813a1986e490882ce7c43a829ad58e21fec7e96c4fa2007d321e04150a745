// Protocol Buffers - Google's data interchange format
// Copyright 2007 Google Inc.  All rights reserved.
// https://developers.google.com/protocol-buffers/
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//     * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

// Author: kenton@google.com (Kenton Varda)
//
// This is proto2's version of MessageSet.  See go/messageset to learn what
// MessageSets are and how they are used.
//
// In proto2, we implement MessageSet in terms of extensions, except with a
// special wire format for backwards-compatibility.  To define a message that
// goes in a MessageSet in proto2, you must declare within that message's
// scope an extension of MessageSet named "message_set_extension" and with
// the field number matching the type ID.  So, for example, this proto1 code:
//   message Foo {
//     enum TypeId { MESSAGE_TYPE_ID = 1234; }
//   }
// becomes this proto2 code:
//   message Foo {
//     extend google.protobuf.bridge.MessageSet {
//       optional Foo message_set_extension = 1234;
//     }
//   }
//
// Now you can use the usual proto2 extensions accessors to access this
// message.  For example, the proto1 code:
//   MessageSet mset;
//   Foo* foo = mset.get_mutable<Foo>();
// becomes this proto2 code:
//   google::protobuf::bridge::MessageSet mset;
//   Foo* foo = mset.MutableExtension(Foo::message_set_extension);
//
// Of course, new code that doesn't have backwards-compatibility requirements
// should just use extensions themselves and not worry about MessageSet.

syntax = "proto2";

package google.protobuf.bridge;

option java_outer_classname = "MessageSetProtos";
option java_multiple_files = true;
option cc_enable_arenas = true;
option objc_class_prefix = "GPB";

// This is proto2's version of MessageSet.
message MessageSet {
  option message_set_wire_format = true;

  extensions 4 to max [verification = UNVERIFIED];
}
