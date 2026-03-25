// Protocol Buffers - Google's data interchange format
// Copyright 2008 Google Inc.  All rights reserved.
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

syntax = "proto3";

package google.protobuf;

import "google/protobuf/source_context.proto";
import "google/protobuf/type.proto";

option java_package = "com.google.protobuf";
option java_outer_classname = "ApiProto";
option java_multiple_files = true;
option objc_class_prefix = "GPB";
option csharp_namespace = "Google.Protobuf.WellKnownTypes";
option go_package = "google.golang.org/protobuf/types/known/apipb";

// Api is a light-weight descriptor for an API Interface.
//
// Interfaces are also described as "protocol buffer services" in some contexts,
// such as by the "service" keyword in a .proto file, but they are different
// from API Services, which represent a concrete implementation of an interface
// as opposed to simply a description of methods and bindings. They are also
// sometimes simply referred to as "APIs" in other contexts, such as the name of
// this message itself. See https://cloud.google.com/apis/design/glossary for
// detailed terminology.
message Api {
  // The fully qualified name of this interface, including package name
  // followed by the interface's simple name.
  string name = 1;

  // The methods of this interface, in unspecified order.
  repeated Method methods = 2;

  // Any metadata attached to the interface.
  repeated Option options = 3;

  // A version string for this interface. If specified, must have the form
  // `major-version.minor-version`, as in `1.10`. If the minor version is
  // omitted, it defaults to zero. If the entire version field is empty, the
  // major version is derived from the package name, as outlined below. If the
  // field is not empty, the version in the package name will be verified to be
  // consistent with what is provided here.
  //
  // The versioning schema uses [semantic
  // versioning](http://semver.org) where the major version number
  // indicates a breaking change and the minor version an additive,
  // non-breaking change. Both version numbers are signals to users
  // what to expect from different versions, and should be carefully
  // chosen based on the product plan.
  //
  // The major version is also reflected in the package name of the
  // interface, which must end in `v<major-version>`, as in
  // `google.feature.v1`. For major versions 0 and 1, the suffix can
  // be omitted. Zero major versions must only be used for
  // experimental, non-GA interfaces.
  //
  string version = 4;

  // Source context for the protocol buffer service represented by this
  // message.
  SourceContext source_context = 5;

  // Included interfaces. See [Mixin][].
  repeated Mixin mixins = 6;

  // The source syntax of the service.
  Syntax syntax = 7;
}

// Method represents a method of an API interface.
message Method {
  // The simple name of this method.
  string name = 1;

  // A URL of the input message type.
  string request_type_url = 2;

  // If true, the request is streamed.
  bool request_streaming = 3;

  // The URL of the output message type.
  string response_type_url = 4;

  // If true, the response is streamed.
  bool response_streaming = 5;

  // Any metadata attached to the method.
  repeated Option options = 6;

  // The source syntax of this method.
  Syntax syntax = 7;
}

// Declares an API Interface to be included in this interface. The including
// interface must redeclare all the methods from the included interface, but
// documentation and options are inherited as follows:
//
// - If after comment and whitespace stripping, the documentation
//   string of the redeclared method is empty, it will be inherited
//   from the original method.
//
// - Each annotation belonging to the service config (http,
//   visibility) which is not set in the redeclared method will be
//   inherited.
//
// - If an http annotation is inherited, the path pattern will be
//   modified as follows. Any version prefix will be replaced by the
//   version of the including interface plus the [root][] path if
//   specified.
//
// Example of a simple mixin:
//
//     package google.acl.v1;
//     service AccessControl {
//       // Get the underlying ACL object.
//       rpc GetAcl(GetAclRequest) returns (Acl) {
//         option (google.api.http).get = "/v1/{resource=**}:getAcl";
//       }
//     }
//
//     package google.storage.v2;
//     service Storage {
//       rpc GetAcl(GetAclRequest) returns (Acl);
//
//       // Get a data record.
//       rpc GetData(GetDataRequest) returns (Data) {
//         option (google.api.http).get = "/v2/{resource=**}";
//       }
//     }
//
// Example of a mixin configuration:
//
//     apis:
//     - name: google.storage.v2.Storage
//       mixins:
//       - name: google.acl.v1.AccessControl
//
// The mixin construct implies that all methods in `AccessControl` are
// also declared with same name and request/response types in
// `Storage`. A documentation generator or annotation processor will
// see the effective `Storage.GetAcl` method after inherting
// documentation and annotations as follows:
//
//     service Storage {
//       // Get the underlying ACL object.
//       rpc GetAcl(GetAclRequest) returns (Acl) {
//         option (google.api.http).get = "/v2/{resource=**}:getAcl";
//       }
//       ...
//     }
//
// Note how the version in the path pattern changed from `v1` to `v2`.
//
// If the `root` field in the mixin is specified, it should be a
// relative path under which inherited HTTP paths are placed. Example:
//
//     apis:
//     - name: google.storage.v2.Storage
//       mixins:
//       - name: google.acl.v1.AccessControl
//         root: acls
//
// This implies the following inherited HTTP annotation:
//
//     service Storage {
//       // Get the underlying ACL object.
//       rpc GetAcl(GetAclRequest) returns (Acl) {
//         option (google.api.http).get = "/v2/acls/{resource=**}:getAcl";
//       }
//       ...
//     }
message Mixin {
  // The fully qualified name of the interface which is included.
  string name = 1;

  // If non-empty specifies a path under which inherited HTTP paths
  // are rooted.
  string root = 2;
}
