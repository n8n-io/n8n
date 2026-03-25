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

package google.monitoring.v3;

import "google/api/annotations.proto";
import "google/api/client.proto";
import "google/api/field_behavior.proto";
import "google/api/resource.proto";
import "google/monitoring/v3/snooze.proto";
import "google/protobuf/field_mask.proto";

option csharp_namespace = "Google.Cloud.Monitoring.V3";
option go_package = "cloud.google.com/go/monitoring/apiv3/v2/monitoringpb;monitoringpb";
option java_multiple_files = true;
option java_outer_classname = "SnoozeServiceProto";
option java_package = "com.google.monitoring.v3";
option php_namespace = "Google\\Cloud\\Monitoring\\V3";
option ruby_package = "Google::Cloud::Monitoring::V3";

// The SnoozeService API is used to temporarily prevent an alert policy from
// generating alerts. A Snooze is a description of the criteria under which one
// or more alert policies should not fire alerts for the specified duration.
service SnoozeService {
  option (google.api.default_host) = "monitoring.googleapis.com";
  option (google.api.oauth_scopes) =
      "https://www.googleapis.com/auth/cloud-platform,"
      "https://www.googleapis.com/auth/monitoring,"
      "https://www.googleapis.com/auth/monitoring.read";

  // Creates a `Snooze` that will prevent alerts, which match the provided
  // criteria, from being opened. The `Snooze` applies for a specific time
  // interval.
  rpc CreateSnooze(CreateSnoozeRequest) returns (Snooze) {
    option (google.api.http) = {
      post: "/v3/{parent=projects/*}/snoozes"
      body: "snooze"
    };
    option (google.api.method_signature) = "parent,snooze";
  }

  // Lists the `Snooze`s associated with a project. Can optionally pass in
  // `filter`, which specifies predicates to match `Snooze`s.
  rpc ListSnoozes(ListSnoozesRequest) returns (ListSnoozesResponse) {
    option (google.api.http) = {
      get: "/v3/{parent=projects/*}/snoozes"
    };
    option (google.api.method_signature) = "parent";
  }

  // Retrieves a `Snooze` by `name`.
  rpc GetSnooze(GetSnoozeRequest) returns (Snooze) {
    option (google.api.http) = {
      get: "/v3/{name=projects/*/snoozes/*}"
    };
    option (google.api.method_signature) = "name";
  }

  // Updates a `Snooze`, identified by its `name`, with the parameters in the
  // given `Snooze` object.
  rpc UpdateSnooze(UpdateSnoozeRequest) returns (Snooze) {
    option (google.api.http) = {
      patch: "/v3/{snooze.name=projects/*/snoozes/*}"
      body: "snooze"
    };
    option (google.api.method_signature) = "snooze,update_mask";
  }
}

// The message definition for creating a `Snooze`. Users must provide the body
// of the `Snooze` to be created but must omit the `Snooze` field, `name`.
message CreateSnoozeRequest {
  // Required. The
  // [project](https://cloud.google.com/monitoring/api/v3#project_name) in which
  // a `Snooze` should be created. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]
  string parent = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "monitoring.googleapis.com/Snooze"
    }
  ];

  // Required. The `Snooze` to create. Omit the `name` field, as it will be
  // filled in by the API.
  Snooze snooze = 2 [(google.api.field_behavior) = REQUIRED];
}

// The message definition for listing `Snooze`s associated with the given
// `parent`, satisfying the optional `filter`.
message ListSnoozesRequest {
  // Required. The
  // [project](https://cloud.google.com/monitoring/api/v3#project_name) whose
  // `Snooze`s should be listed. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]
  string parent = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      child_type: "monitoring.googleapis.com/Snooze"
    }
  ];

  // Optional. Optional filter to restrict results to the given criteria. The
  // following fields are supported.
  //
  //   * `interval.start_time`
  //   * `interval.end_time`
  //
  // For example:
  //
  //     ```
  //     interval.start_time > "2022-03-11T00:00:00-08:00" AND
  //         interval.end_time < "2022-03-12T00:00:00-08:00"
  //     ```
  string filter = 2 [(google.api.field_behavior) = OPTIONAL];

  // Optional. The maximum number of results to return for a single query. The
  // server may further constrain the maximum number of results returned in a
  // single page. The value should be in the range [1, 1000]. If the value given
  // is outside this range, the server will decide the number of results to be
  // returned.
  int32 page_size = 4 [(google.api.field_behavior) = OPTIONAL];

  // Optional. The `next_page_token` from a previous call to
  // `ListSnoozesRequest` to get the next page of results.
  string page_token = 5 [(google.api.field_behavior) = OPTIONAL];
}

// The results of a successful `ListSnoozes` call, containing the matching
// `Snooze`s.
message ListSnoozesResponse {
  // `Snooze`s matching this list call.
  repeated Snooze snoozes = 1;

  // Page token for repeated calls to `ListSnoozes`, to fetch additional pages
  // of results. If this is empty or missing, there are no more pages.
  string next_page_token = 2;
}

// The message definition for retrieving a `Snooze`. Users must specify the
// field, `name`, which identifies the `Snooze`.
message GetSnoozeRequest {
  // Required. The ID of the `Snooze` to retrieve. The format is:
  //
  //     projects/[PROJECT_ID_OR_NUMBER]/snoozes/[SNOOZE_ID]
  string name = 1 [
    (google.api.field_behavior) = REQUIRED,
    (google.api.resource_reference) = {
      type: "monitoring.googleapis.com/Snooze"
    }
  ];
}

// The message definition for updating a `Snooze`. The field, `snooze.name`
// identifies the `Snooze` to be updated. The remainder of `snooze` gives the
// content the `Snooze` in question will be assigned.
//
// What fields can be updated depends on the start time and end time of the
// `Snooze`.
//
//   * end time is in the past: These `Snooze`s are considered
//     read-only and cannot be updated.
//   * start time is in the past and end time is in the future: `display_name`
//     and `interval.end_time` can be updated.
//   * start time is in the future: `display_name`, `interval.start_time` and
//     `interval.end_time` can be updated.
message UpdateSnoozeRequest {
  // Required. The `Snooze` to update. Must have the name field present.
  Snooze snooze = 1 [(google.api.field_behavior) = REQUIRED];

  // Required. The fields to update.
  //
  // For each field listed in `update_mask`:
  //
  //   * If the `Snooze` object supplied in the `UpdateSnoozeRequest` has a
  //     value for that field, the value of the field in the existing `Snooze`
  //     will be set to the value of the field in the supplied `Snooze`.
  //   * If the field does not have a value in the supplied `Snooze`, the field
  //     in the existing `Snooze` is set to its default value.
  //
  // Fields not listed retain their existing value.
  //
  // The following are the field names that are accepted in `update_mask`:
  //
  //   * `display_name`
  //   * `interval.start_time`
  //   * `interval.end_time`
  //
  // That said, the start time and end time of the `Snooze` determines which
  // fields can legally be updated. Before attempting an update, users should
  // consult the documentation for `UpdateSnoozeRequest`, which talks about
  // which fields can be updated.
  google.protobuf.FieldMask update_mask = 2
      [(google.api.field_behavior) = REQUIRED];
}
