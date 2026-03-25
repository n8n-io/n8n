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

package google.api.servicecontrol.v1;

import "google/api/servicecontrol/v1/http_request.proto";
import "google/logging/type/log_severity.proto";
import "google/protobuf/any.proto";
import "google/protobuf/struct.proto";
import "google/protobuf/timestamp.proto";

option csharp_namespace = "Google.Cloud.ServiceControl.V1";
option go_package = "cloud.google.com/go/servicecontrol/apiv1/servicecontrolpb;servicecontrolpb";
option java_multiple_files = true;
option java_outer_classname = "LogEntryProto";
option java_package = "com.google.api.servicecontrol.v1";
option php_namespace = "Google\\Cloud\\ServiceControl\\V1";
option ruby_package = "Google::Cloud::ServiceControl::V1";

// An individual log entry.
message LogEntry {
  // Required. The log to which this log entry belongs. Examples: `"syslog"`,
  // `"book_log"`.
  string name = 10;

  // The time the event described by the log entry occurred. If
  // omitted, defaults to operation start time.
  google.protobuf.Timestamp timestamp = 11;

  // The severity of the log entry. The default value is
  // `LogSeverity.DEFAULT`.
  google.logging.type.LogSeverity severity = 12;

  // Optional. Information about the HTTP request associated with this
  // log entry, if applicable.
  HttpRequest http_request = 14;

  // Optional. Resource name of the trace associated with the log entry, if any.
  // If this field contains a relative resource name, you can assume the name is
  // relative to `//tracing.googleapis.com`. Example:
  // `projects/my-projectid/traces/06796866738c859f2f19b7cfb3214824`
  string trace = 15;

  // A unique ID for the log entry used for deduplication. If omitted,
  // the implementation will generate one based on operation_id.
  string insert_id = 4;

  // A set of user-defined (key, value) data that provides additional
  // information about the log entry.
  map<string, string> labels = 13;

  // The log entry payload, which can be one of multiple types.
  oneof payload {
    // The log entry payload, represented as a protocol buffer that is
    // expressed as a JSON object. The only accepted type currently is
    // [AuditLog][google.cloud.audit.AuditLog].
    google.protobuf.Any proto_payload = 2;

    // The log entry payload, represented as a Unicode string (UTF-8).
    string text_payload = 3;

    // The log entry payload, represented as a structure that
    // is expressed as a JSON object.
    google.protobuf.Struct struct_payload = 6;
  }

  // Optional. Information about an operation associated with the log entry, if
  // applicable.
  LogEntryOperation operation = 16;

  // Optional. Source code location information associated with the log entry,
  // if any.
  LogEntrySourceLocation source_location = 17;
}

// Additional information about a potentially long-running operation with which
// a log entry is associated.
message LogEntryOperation {
  // Optional. An arbitrary operation identifier. Log entries with the
  // same identifier are assumed to be part of the same operation.
  string id = 1;

  // Optional. An arbitrary producer identifier. The combination of
  // `id` and `producer` must be globally unique.  Examples for `producer`:
  // `"MyDivision.MyBigCompany.com"`, `"github.com/MyProject/MyApplication"`.
  string producer = 2;

  // Optional. Set this to True if this is the first log entry in the operation.
  bool first = 3;

  // Optional. Set this to True if this is the last log entry in the operation.
  bool last = 4;
}

// Additional information about the source code location that produced the log
// entry.
message LogEntrySourceLocation {
  // Optional. Source file name. Depending on the runtime environment, this
  // might be a simple name or a fully-qualified name.
  string file = 1;

  // Optional. Line within the source file. 1-based; 0 indicates no line number
  // available.
  int64 line = 2;

  // Optional. Human-readable name of the function or method being invoked, with
  // optional context such as the class or package name. This information may be
  // used in contexts such as the logs viewer, where a file and line number are
  // less meaningful. The format can vary by language. For example:
  // `qual.if.ied.Class.method` (Java), `dir/package.func` (Go), `function`
  // (Python).
  string function = 3;
}
