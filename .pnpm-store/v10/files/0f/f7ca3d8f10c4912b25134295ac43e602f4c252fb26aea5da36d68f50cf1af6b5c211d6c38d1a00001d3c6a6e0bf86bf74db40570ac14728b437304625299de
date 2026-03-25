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

option cc_enable_arenas = true;
option go_package = "google.golang.org/genproto/googleapis/api/serviceconfig;serviceconfig";
option java_multiple_files = true;
option java_outer_classname = "PolicyProto";
option java_package = "com.google.api";
option objc_class_prefix = "GAPI";

// Provides `google.api.field_policy` annotation at proto fields.
extend google.protobuf.FieldOptions {
  // See [FieldPolicy][].
  FieldPolicy field_policy = 158361448;
}

// Provides `google.api.method_policy` annotation at proto methods.
extend google.protobuf.MethodOptions {
  // See [MethodPolicy][].
  MethodPolicy method_policy = 161893301;
}

// Google API Policy Annotation
//
// This message defines a simple API policy annotation that can be used to
// annotate API request and response message fields with applicable policies.
// One field may have multiple applicable policies that must all be satisfied
// before a request can be processed. This policy annotation is used to
// generate the overall policy that will be used for automatic runtime
// policy enforcement and documentation generation.
message FieldPolicy {
  // Selects one or more request or response message fields to apply this
  // `FieldPolicy`.
  //
  // When a `FieldPolicy` is used in proto annotation, the selector must
  // be left as empty. The service config generator will automatically fill
  // the correct value.
  //
  // When a `FieldPolicy` is used in service config, the selector must be a
  // comma-separated string with valid request or response field paths,
  // such as "foo.bar" or "foo.bar,foo.baz".
  string selector = 1;

  // Specifies the required permission(s) for the resource referred to by the
  // field. It requires the field contains a valid resource reference, and
  // the request must pass the permission checks to proceed. For example,
  // "resourcemanager.projects.get".
  string resource_permission = 2;

  // Specifies the resource type for the resource referred to by the field.
  string resource_type = 3;
}

// Defines policies applying to an RPC method.
message MethodPolicy {
  // Selects a method to which these policies should be enforced, for example,
  // "google.pubsub.v1.Subscriber.CreateSubscription".
  //
  // Refer to [selector][google.api.DocumentationRule.selector] for syntax
  // details.
  //
  // NOTE: This field must not be set in the proto annotation. It will be
  // automatically filled by the service config compiler .
  string selector = 9;

  // Policies that are applicable to the request message.
  repeated FieldPolicy request_policies = 2;
}
