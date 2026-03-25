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

option go_package = "google.golang.org/genproto/googleapis/api/serviceconfig;serviceconfig";
option java_multiple_files = true;
option java_outer_classname = "ContextProto";
option java_package = "com.google.api";
option objc_class_prefix = "GAPI";

// `Context` defines which contexts an API requests.
//
// Example:
//
//     context:
//       rules:
//       - selector: "*"
//         requested:
//         - google.rpc.context.ProjectContext
//         - google.rpc.context.OriginContext
//
// The above specifies that all methods in the API request
// `google.rpc.context.ProjectContext` and
// `google.rpc.context.OriginContext`.
//
// Available context types are defined in package
// `google.rpc.context`.
//
// This also provides mechanism to allowlist any protobuf message extension that
// can be sent in grpc metadata using “x-goog-ext-<extension_id>-bin” and
// “x-goog-ext-<extension_id>-jspb” format. For example, list any service
// specific protobuf types that can appear in grpc metadata as follows in your
// yaml file:
//
// Example:
//
//     context:
//       rules:
//        - selector: "google.example.library.v1.LibraryService.CreateBook"
//          allowed_request_extensions:
//          - google.foo.v1.NewExtension
//          allowed_response_extensions:
//          - google.foo.v1.NewExtension
//
// You can also specify extension ID instead of fully qualified extension name
// here.
message Context {
  // A list of RPC context rules that apply to individual API methods.
  //
  // **NOTE:** All service configuration rules follow "last one wins" order.
  repeated ContextRule rules = 1;
}

// A context rule provides information about the context for an individual API
// element.
message ContextRule {
  // Selects the methods to which this rule applies.
  //
  // Refer to [selector][google.api.DocumentationRule.selector] for syntax
  // details.
  string selector = 1;

  // A list of full type names of requested contexts.
  repeated string requested = 2;

  // A list of full type names of provided contexts.
  repeated string provided = 3;

  // A list of full type names or extension IDs of extensions allowed in grpc
  // side channel from client to backend.
  repeated string allowed_request_extensions = 4;

  // A list of full type names or extension IDs of extensions allowed in grpc
  // side channel from backend to client.
  repeated string allowed_response_extensions = 5;
}
