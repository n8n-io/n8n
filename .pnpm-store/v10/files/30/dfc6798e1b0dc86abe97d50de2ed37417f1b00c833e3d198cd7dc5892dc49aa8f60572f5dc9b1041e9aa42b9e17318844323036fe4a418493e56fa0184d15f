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
option java_outer_classname = "RoutingProto";
option java_package = "com.google.api";
option objc_class_prefix = "GAPI";

extend google.protobuf.MethodOptions {
  // See RoutingRule.
  google.api.RoutingRule routing = 72295729;
}

// Specifies the routing information that should be sent along with the request
// in the form of routing header.
// **NOTE:** All service configuration rules follow the "last one wins" order.
//
// The examples below will apply to an RPC which has the following request type:
//
// Message Definition:
//
//     message Request {
//       // The name of the Table
//       // Values can be of the following formats:
//       // - `projects/<project>/tables/<table>`
//       // - `projects/<project>/instances/<instance>/tables/<table>`
//       // - `region/<region>/zones/<zone>/tables/<table>`
//       string table_name = 1;
//
//       // This value specifies routing for replication.
//       // It can be in the following formats:
//       // - `profiles/<profile_id>`
//       // - a legacy `profile_id` that can be any string
//       string app_profile_id = 2;
//     }
//
// Example message:
//
//     {
//       table_name: projects/proj_foo/instances/instance_bar/table/table_baz,
//       app_profile_id: profiles/prof_qux
//     }
//
// The routing header consists of one or multiple key-value pairs. Every key
// and value must be percent-encoded, and joined together in the format of
// `key1=value1&key2=value2`.
// In the examples below I am skipping the percent-encoding for readablity.
//
// Example 1
//
// Extracting a field from the request to put into the routing header
// unchanged, with the key equal to the field name.
//
// annotation:
//
//     option (google.api.routing) = {
//       // Take the `app_profile_id`.
//       routing_parameters {
//         field: "app_profile_id"
//       }
//     };
//
// result:
//
//     x-goog-request-params: app_profile_id=profiles/prof_qux
//
// Example 2
//
// Extracting a field from the request to put into the routing header
// unchanged, with the key different from the field name.
//
// annotation:
//
//     option (google.api.routing) = {
//       // Take the `app_profile_id`, but name it `routing_id` in the header.
//       routing_parameters {
//         field: "app_profile_id"
//         path_template: "{routing_id=**}"
//       }
//     };
//
// result:
//
//     x-goog-request-params: routing_id=profiles/prof_qux
//
// Example 3
//
// Extracting a field from the request to put into the routing
// header, while matching a path template syntax on the field's value.
//
// NB: it is more useful to send nothing than to send garbage for the purpose
// of dynamic routing, since garbage pollutes cache. Thus the matching.
//
// Sub-example 3a
//
// The field matches the template.
//
// annotation:
//
//     option (google.api.routing) = {
//       // Take the `table_name`, if it's well-formed (with project-based
//       // syntax).
//       routing_parameters {
//         field: "table_name"
//         path_template: "{table_name=projects/*/instances/*/**}"
//       }
//     };
//
// result:
//
//     x-goog-request-params:
//     table_name=projects/proj_foo/instances/instance_bar/table/table_baz
//
// Sub-example 3b
//
// The field does not match the template.
//
// annotation:
//
//     option (google.api.routing) = {
//       // Take the `table_name`, if it's well-formed (with region-based
//       // syntax).
//       routing_parameters {
//         field: "table_name"
//         path_template: "{table_name=regions/*/zones/*/**}"
//       }
//     };
//
// result:
//
//     <no routing header will be sent>
//
// Sub-example 3c
//
// Multiple alternative conflictingly named path templates are
// specified. The one that matches is used to construct the header.
//
// annotation:
//
//     option (google.api.routing) = {
//       // Take the `table_name`, if it's well-formed, whether
//       // using the region- or projects-based syntax.
//
//       routing_parameters {
//         field: "table_name"
//         path_template: "{table_name=regions/*/zones/*/**}"
//       }
//       routing_parameters {
//         field: "table_name"
//         path_template: "{table_name=projects/*/instances/*/**}"
//       }
//     };
//
// result:
//
//     x-goog-request-params:
//     table_name=projects/proj_foo/instances/instance_bar/table/table_baz
//
// Example 4
//
// Extracting a single routing header key-value pair by matching a
// template syntax on (a part of) a single request field.
//
// annotation:
//
//     option (google.api.routing) = {
//       // Take just the project id from the `table_name` field.
//       routing_parameters {
//         field: "table_name"
//         path_template: "{routing_id=projects/*}/**"
//       }
//     };
//
// result:
//
//     x-goog-request-params: routing_id=projects/proj_foo
//
// Example 5
//
// Extracting a single routing header key-value pair by matching
// several conflictingly named path templates on (parts of) a single request
// field. The last template to match "wins" the conflict.
//
// annotation:
//
//     option (google.api.routing) = {
//       // If the `table_name` does not have instances information,
//       // take just the project id for routing.
//       // Otherwise take project + instance.
//
//       routing_parameters {
//         field: "table_name"
//         path_template: "{routing_id=projects/*}/**"
//       }
//       routing_parameters {
//         field: "table_name"
//         path_template: "{routing_id=projects/*/instances/*}/**"
//       }
//     };
//
// result:
//
//     x-goog-request-params:
//     routing_id=projects/proj_foo/instances/instance_bar
//
// Example 6
//
// Extracting multiple routing header key-value pairs by matching
// several non-conflicting path templates on (parts of) a single request field.
//
// Sub-example 6a
//
// Make the templates strict, so that if the `table_name` does not
// have an instance information, nothing is sent.
//
// annotation:
//
//     option (google.api.routing) = {
//       // The routing code needs two keys instead of one composite
//       // but works only for the tables with the "project-instance" name
//       // syntax.
//
//       routing_parameters {
//         field: "table_name"
//         path_template: "{project_id=projects/*}/instances/*/**"
//       }
//       routing_parameters {
//         field: "table_name"
//         path_template: "projects/*/{instance_id=instances/*}/**"
//       }
//     };
//
// result:
//
//     x-goog-request-params:
//     project_id=projects/proj_foo&instance_id=instances/instance_bar
//
// Sub-example 6b
//
// Make the templates loose, so that if the `table_name` does not
// have an instance information, just the project id part is sent.
//
// annotation:
//
//     option (google.api.routing) = {
//       // The routing code wants two keys instead of one composite
//       // but will work with just the `project_id` for tables without
//       // an instance in the `table_name`.
//
//       routing_parameters {
//         field: "table_name"
//         path_template: "{project_id=projects/*}/**"
//       }
//       routing_parameters {
//         field: "table_name"
//         path_template: "projects/*/{instance_id=instances/*}/**"
//       }
//     };
//
// result (is the same as 6a for our example message because it has the instance
// information):
//
//     x-goog-request-params:
//     project_id=projects/proj_foo&instance_id=instances/instance_bar
//
// Example 7
//
// Extracting multiple routing header key-value pairs by matching
// several path templates on multiple request fields.
//
// NB: note that here there is no way to specify sending nothing if one of the
// fields does not match its template. E.g. if the `table_name` is in the wrong
// format, the `project_id` will not be sent, but the `routing_id` will be.
// The backend routing code has to be aware of that and be prepared to not
// receive a full complement of keys if it expects multiple.
//
// annotation:
//
//     option (google.api.routing) = {
//       // The routing needs both `project_id` and `routing_id`
//       // (from the `app_profile_id` field) for routing.
//
//       routing_parameters {
//         field: "table_name"
//         path_template: "{project_id=projects/*}/**"
//       }
//       routing_parameters {
//         field: "app_profile_id"
//         path_template: "{routing_id=**}"
//       }
//     };
//
// result:
//
//     x-goog-request-params:
//     project_id=projects/proj_foo&routing_id=profiles/prof_qux
//
// Example 8
//
// Extracting a single routing header key-value pair by matching
// several conflictingly named path templates on several request fields. The
// last template to match "wins" the conflict.
//
// annotation:
//
//     option (google.api.routing) = {
//       // The `routing_id` can be a project id or a region id depending on
//       // the table name format, but only if the `app_profile_id` is not set.
//       // If `app_profile_id` is set it should be used instead.
//
//       routing_parameters {
//         field: "table_name"
//         path_template: "{routing_id=projects/*}/**"
//       }
//       routing_parameters {
//          field: "table_name"
//          path_template: "{routing_id=regions/*}/**"
//       }
//       routing_parameters {
//         field: "app_profile_id"
//         path_template: "{routing_id=**}"
//       }
//     };
//
// result:
//
//     x-goog-request-params: routing_id=profiles/prof_qux
//
// Example 9
//
// Bringing it all together.
//
// annotation:
//
//     option (google.api.routing) = {
//       // For routing both `table_location` and a `routing_id` are needed.
//       //
//       // table_location can be either an instance id or a region+zone id.
//       //
//       // For `routing_id`, take the value of `app_profile_id`
//       // - If it's in the format `profiles/<profile_id>`, send
//       // just the `<profile_id>` part.
//       // - If it's any other literal, send it as is.
//       // If the `app_profile_id` is empty, and the `table_name` starts with
//       // the project_id, send that instead.
//
//       routing_parameters {
//         field: "table_name"
//         path_template: "projects/*/{table_location=instances/*}/tables/*"
//       }
//       routing_parameters {
//         field: "table_name"
//         path_template: "{table_location=regions/*/zones/*}/tables/*"
//       }
//       routing_parameters {
//         field: "table_name"
//         path_template: "{routing_id=projects/*}/**"
//       }
//       routing_parameters {
//         field: "app_profile_id"
//         path_template: "{routing_id=**}"
//       }
//       routing_parameters {
//         field: "app_profile_id"
//         path_template: "profiles/{routing_id=*}"
//       }
//     };
//
// result:
//
//     x-goog-request-params:
//     table_location=instances/instance_bar&routing_id=prof_qux
message RoutingRule {
  // A collection of Routing Parameter specifications.
  // **NOTE:** If multiple Routing Parameters describe the same key
  // (via the `path_template` field or via the `field` field when
  // `path_template` is not provided), "last one wins" rule
  // determines which Parameter gets used.
  // See the examples for more details.
  repeated RoutingParameter routing_parameters = 2;
}

// A projection from an input message to the GRPC or REST header.
message RoutingParameter {
  // A request field to extract the header key-value pair from.
  string field = 1;

  // A pattern matching the key-value field. Optional.
  // If not specified, the whole field specified in the `field` field will be
  // taken as value, and its name used as key. If specified, it MUST contain
  // exactly one named segment (along with any number of unnamed segments) The
  // pattern will be matched over the field specified in the `field` field, then
  // if the match is successful:
  // - the name of the single named segment will be used as a header name,
  // - the match value of the segment will be used as a header value;
  // if the match is NOT successful, nothing will be sent.
  //
  // Example:
  //
  //               -- This is a field in the request message
  //              |   that the header value will be extracted from.
  //              |
  //              |                     -- This is the key name in the
  //              |                    |   routing header.
  //              V                    |
  //     field: "table_name"           v
  //     path_template: "projects/*/{table_location=instances/*}/tables/*"
  //                                                ^            ^
  //                                                |            |
  //       In the {} brackets is the pattern that --             |
  //       specifies what to extract from the                    |
  //       field as a value to be sent.                          |
  //                                                             |
  //      The string in the field must match the whole pattern --
  //      before brackets, inside brackets, after brackets.
  //
  // When looking at this specific example, we can see that:
  // - A key-value pair with the key `table_location`
  //   and the value matching `instances/*` should be added
  //   to the x-goog-request-params routing header.
  // - The value is extracted from the request message's `table_name` field
  //   if it matches the full pattern specified:
  //   `projects/*/instances/*/tables/*`.
  //
  // **NB:** If the `path_template` field is not provided, the key name is
  // equal to the field name, and the whole field should be sent as a value.
  // This makes the pattern for the field and the value functionally equivalent
  // to `**`, and the configuration
  //
  //     {
  //       field: "table_name"
  //     }
  //
  // is a functionally equivalent shorthand to:
  //
  //     {
  //       field: "table_name"
  //       path_template: "{table_name=**}"
  //     }
  //
  // See Example 1 for more details.
  string path_template = 2;
}
