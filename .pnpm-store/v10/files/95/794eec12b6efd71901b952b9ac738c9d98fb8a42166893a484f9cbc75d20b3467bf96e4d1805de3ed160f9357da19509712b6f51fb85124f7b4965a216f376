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

option go_package = "google.golang.org/genproto/googleapis/api/configchange;configchange";
option java_multiple_files = true;
option java_outer_classname = "ConfigChangeProto";
option java_package = "com.google.api";
option objc_class_prefix = "GAPI";

// Output generated from semantically comparing two versions of a service
// configuration.
//
// Includes detailed information about a field that have changed with
// applicable advice about potential consequences for the change, such as
// backwards-incompatibility.
message ConfigChange {
  // Object hierarchy path to the change, with levels separated by a '.'
  // character. For repeated fields, an applicable unique identifier field is
  // used for the index (usually selector, name, or id). For maps, the term
  // 'key' is used. If the field has no unique identifier, the numeric index
  // is used.
  // Examples:
  // - visibility.rules[selector=="google.LibraryService.ListBooks"].restriction
  // - quota.metric_rules[selector=="google"].metric_costs[key=="reads"].value
  // - logging.producer_destinations[0]
  string element = 1;

  // Value of the changed object in the old Service configuration,
  // in JSON format. This field will not be populated if ChangeType == ADDED.
  string old_value = 2;

  // Value of the changed object in the new Service configuration,
  // in JSON format. This field will not be populated if ChangeType == REMOVED.
  string new_value = 3;

  // The type for this change, either ADDED, REMOVED, or MODIFIED.
  ChangeType change_type = 4;

  // Collection of advice provided for this change, useful for determining the
  // possible impact of this change.
  repeated Advice advices = 5;
}

// Generated advice about this change, used for providing more
// information about how a change will affect the existing service.
message Advice {
  // Useful description for why this advice was applied and what actions should
  // be taken to mitigate any implied risks.
  string description = 2;
}

// Classifies set of possible modifications to an object in the service
// configuration.
enum ChangeType {
  // No value was provided.
  CHANGE_TYPE_UNSPECIFIED = 0;

  // The changed object exists in the 'new' service configuration, but not
  // in the 'old' service configuration.
  ADDED = 1;

  // The changed object exists in the 'old' service configuration, but not
  // in the 'new' service configuration.
  REMOVED = 2;

  // The changed object exists in both service configurations, but its value
  // is different.
  MODIFIED = 3;
}
