// Copyright 2021 Google LLC
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

package google.type;

option cc_enable_arenas = true;
option go_package = "google.golang.org/genproto/googleapis/type/timeofday;timeofday";
option java_multiple_files = true;
option java_outer_classname = "TimeOfDayProto";
option java_package = "com.google.type";
option objc_class_prefix = "GTP";

// Represents a time of day. The date and time zone are either not significant
// or are specified elsewhere. An API may choose to allow leap seconds. Related
// types are [google.type.Date][google.type.Date] and
// `google.protobuf.Timestamp`.
message TimeOfDay {
  // Hours of day in 24 hour format. Should be from 0 to 23. An API may choose
  // to allow the value "24:00:00" for scenarios like business closing time.
  int32 hours = 1;

  // Minutes of hour of day. Must be from 0 to 59.
  int32 minutes = 2;

  // Seconds of minutes of the time. Must normally be from 0 to 59. An API may
  // allow the value 60 if it allows leap-seconds.
  int32 seconds = 3;

  // Fractions of seconds in nanoseconds. Must be from 0 to 999,999,999.
  int32 nanos = 4;
}
