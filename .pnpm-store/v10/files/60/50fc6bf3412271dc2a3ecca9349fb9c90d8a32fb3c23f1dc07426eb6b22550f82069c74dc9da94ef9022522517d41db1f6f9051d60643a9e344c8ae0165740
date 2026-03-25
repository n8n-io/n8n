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

import "google/protobuf/duration.proto";

option cc_enable_arenas = true;
option go_package = "google.golang.org/genproto/googleapis/type/datetime;datetime";
option java_multiple_files = true;
option java_outer_classname = "DateTimeProto";
option java_package = "com.google.type";
option objc_class_prefix = "GTP";

// Represents civil time (or occasionally physical time).
//
// This type can represent a civil time in one of a few possible ways:
//
//  * When utc_offset is set and time_zone is unset: a civil time on a calendar
//    day with a particular offset from UTC.
//  * When time_zone is set and utc_offset is unset: a civil time on a calendar
//    day in a particular time zone.
//  * When neither time_zone nor utc_offset is set: a civil time on a calendar
//    day in local time.
//
// The date is relative to the Proleptic Gregorian Calendar.
//
// If year is 0, the DateTime is considered not to have a specific year. month
// and day must have valid, non-zero values.
//
// This type may also be used to represent a physical time if all the date and
// time fields are set and either case of the `time_offset` oneof is set.
// Consider using `Timestamp` message for physical time instead. If your use
// case also would like to store the user's timezone, that can be done in
// another field.
//
// This type is more flexible than some applications may want. Make sure to
// document and validate your application's limitations.
message DateTime {
  // Optional. Year of date. Must be from 1 to 9999, or 0 if specifying a
  // datetime without a year.
  int32 year = 1;

  // Required. Month of year. Must be from 1 to 12.
  int32 month = 2;

  // Required. Day of month. Must be from 1 to 31 and valid for the year and
  // month.
  int32 day = 3;

  // Required. Hours of day in 24 hour format. Should be from 0 to 23. An API
  // may choose to allow the value "24:00:00" for scenarios like business
  // closing time.
  int32 hours = 4;

  // Required. Minutes of hour of day. Must be from 0 to 59.
  int32 minutes = 5;

  // Required. Seconds of minutes of the time. Must normally be from 0 to 59. An
  // API may allow the value 60 if it allows leap-seconds.
  int32 seconds = 6;

  // Required. Fractions of seconds in nanoseconds. Must be from 0 to
  // 999,999,999.
  int32 nanos = 7;

  // Optional. Specifies either the UTC offset or the time zone of the DateTime.
  // Choose carefully between them, considering that time zone data may change
  // in the future (for example, a country modifies their DST start/end dates,
  // and future DateTimes in the affected range had already been stored).
  // If omitted, the DateTime is considered to be in local time.
  oneof time_offset {
    // UTC offset. Must be whole seconds, between -18 hours and +18 hours.
    // For example, a UTC offset of -4:00 would be represented as
    // { seconds: -14400 }.
    google.protobuf.Duration utc_offset = 8;

    // Time zone.
    TimeZone time_zone = 9;
  }
}

// Represents a time zone from the
// [IANA Time Zone Database](https://www.iana.org/time-zones).
message TimeZone {
  // IANA Time Zone Database time zone, e.g. "America/New_York".
  string id = 1;

  // Optional. IANA Time Zone Database version number, e.g. "2019a".
  string version = 2;
}
