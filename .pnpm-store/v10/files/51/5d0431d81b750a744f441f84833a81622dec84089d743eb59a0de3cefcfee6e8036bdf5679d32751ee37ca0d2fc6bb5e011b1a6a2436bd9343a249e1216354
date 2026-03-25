// Copyright 2023 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

syntax = "proto3";

package google.api;

import "google/protobuf/descriptor.proto";

option go_package = "google.golang.org/genproto/googleapis/api/annotations;annotations";
option java_multiple_files = true;
option java_outer_classname = "FieldInfoProto";
option java_package = "com.google.api";
option objc_class_prefix = "GAPI";

extend google.protobuf.FieldOptions {
  // Rich semantic descriptor of an API field beyond the basic typing.
  //
  // Examples:
  //
  //   string request_id = 1 [(google.api.field_info).format = UUID4];
  //   string old_ip_address = 2 [(google.api.field_info).format = IPV4];
  //   string new_ip_address = 3 [(google.api.field_info).format = IPV6];
  //   string actual_ip_address = 4 [
  //     (google.api.field_info).format = IPV4_OR_IPV6
  //   ];
  google.api.FieldInfo field_info = 291403980;
}

// Rich semantic information of an API field beyond basic typing.
message FieldInfo {
  // The standard format of a field value. The supported formats are all backed
  // by either an RFC defined by the IETF or a Google-defined AIP.
  enum Format {
    // Default, unspecified value.
    FORMAT_UNSPECIFIED = 0;

    // Universally Unique Identifier, version 4, value as defined by
    // https://datatracker.ietf.org/doc/html/rfc4122. The value may be
    // normalized to entirely lowercase letters. For example, the value
    // `F47AC10B-58CC-0372-8567-0E02B2C3D479` would be normalized to
    // `f47ac10b-58cc-0372-8567-0e02b2c3d479`.
    UUID4 = 1;

    // Internet Protocol v4 value as defined by [RFC
    // 791](https://datatracker.ietf.org/doc/html/rfc791). The value may be
    // condensed, with leading zeros in each octet stripped. For example,
    // `001.022.233.040` would be condensed to `1.22.233.40`.
    IPV4 = 2;

    // Internet Protocol v6 value as defined by [RFC
    // 2460](https://datatracker.ietf.org/doc/html/rfc2460). The value may be
    // normalized to entirely lowercase letters with zeros compressed, following
    // [RFC 5952](https://datatracker.ietf.org/doc/html/rfc5952). For example,
    // the value `2001:0DB8:0::0` would be normalized to `2001:db8::`.
    IPV6 = 3;

    // An IP address in either v4 or v6 format as described by the individual
    // values defined herein. See the comments on the IPV4 and IPV6 types for
    // allowed normalizations of each.
    IPV4_OR_IPV6 = 4;
  }

  // The standard format of a field value. This does not explicitly configure
  // any API consumer, just documents the API's format for the field it is
  // applied to.
  Format format = 1;
}
