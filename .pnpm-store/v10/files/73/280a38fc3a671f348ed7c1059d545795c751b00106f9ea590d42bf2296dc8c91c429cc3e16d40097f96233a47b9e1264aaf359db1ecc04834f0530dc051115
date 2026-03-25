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

import "google/api/label.proto";
import "google/api/launch_stage.proto";
import "google/protobuf/struct.proto";

option cc_enable_arenas = true;
option go_package = "google.golang.org/genproto/googleapis/api/monitoredres;monitoredres";
option java_multiple_files = true;
option java_outer_classname = "MonitoredResourceProto";
option java_package = "com.google.api";
option objc_class_prefix = "GAPI";

// An object that describes the schema of a
// [MonitoredResource][google.api.MonitoredResource] object using a type name
// and a set of labels.  For example, the monitored resource descriptor for
// Google Compute Engine VM instances has a type of
// `"gce_instance"` and specifies the use of the labels `"instance_id"` and
// `"zone"` to identify particular VM instances.
//
// Different APIs can support different monitored resource types. APIs generally
// provide a `list` method that returns the monitored resource descriptors used
// by the API.
//
message MonitoredResourceDescriptor {
  // Optional. The resource name of the monitored resource descriptor:
  // `"projects/{project_id}/monitoredResourceDescriptors/{type}"` where
  // {type} is the value of the `type` field in this object and
  // {project_id} is a project ID that provides API-specific context for
  // accessing the type.  APIs that do not use project information can use the
  // resource name format `"monitoredResourceDescriptors/{type}"`.
  string name = 5;

  // Required. The monitored resource type. For example, the type
  // `"cloudsql_database"` represents databases in Google Cloud SQL.
  //  For a list of types, see [Monitored resource
  //  types](https://cloud.google.com/monitoring/api/resources)
  // and [Logging resource
  // types](https://cloud.google.com/logging/docs/api/v2/resource-list).
  string type = 1;

  // Optional. A concise name for the monitored resource type that might be
  // displayed in user interfaces. It should be a Title Cased Noun Phrase,
  // without any article or other determiners. For example,
  // `"Google Cloud SQL Database"`.
  string display_name = 2;

  // Optional. A detailed description of the monitored resource type that might
  // be used in documentation.
  string description = 3;

  // Required. A set of labels used to describe instances of this monitored
  // resource type. For example, an individual Google Cloud SQL database is
  // identified by values for the labels `"database_id"` and `"zone"`.
  repeated LabelDescriptor labels = 4;

  // Optional. The launch stage of the monitored resource definition.
  LaunchStage launch_stage = 7;
}

// An object representing a resource that can be used for monitoring, logging,
// billing, or other purposes. Examples include virtual machine instances,
// databases, and storage devices such as disks. The `type` field identifies a
// [MonitoredResourceDescriptor][google.api.MonitoredResourceDescriptor] object
// that describes the resource's schema. Information in the `labels` field
// identifies the actual resource and its attributes according to the schema.
// For example, a particular Compute Engine VM instance could be represented by
// the following object, because the
// [MonitoredResourceDescriptor][google.api.MonitoredResourceDescriptor] for
// `"gce_instance"` has labels
// `"project_id"`, `"instance_id"` and `"zone"`:
//
//     { "type": "gce_instance",
//       "labels": { "project_id": "my-project",
//                   "instance_id": "12345678901234",
//                   "zone": "us-central1-a" }}
message MonitoredResource {
  // Required. The monitored resource type. This field must match
  // the `type` field of a
  // [MonitoredResourceDescriptor][google.api.MonitoredResourceDescriptor]
  // object. For example, the type of a Compute Engine VM instance is
  // `gce_instance`. Some descriptors include the service name in the type; for
  // example, the type of a Datastream stream is
  // `datastream.googleapis.com/Stream`.
  string type = 1;

  // Required. Values for all of the labels listed in the associated monitored
  // resource descriptor. For example, Compute Engine VM instances use the
  // labels `"project_id"`, `"instance_id"`, and `"zone"`.
  map<string, string> labels = 2;
}

// Auxiliary metadata for a [MonitoredResource][google.api.MonitoredResource]
// object. [MonitoredResource][google.api.MonitoredResource] objects contain the
// minimum set of information to uniquely identify a monitored resource
// instance. There is some other useful auxiliary metadata. Monitoring and
// Logging use an ingestion pipeline to extract metadata for cloud resources of
// all types, and store the metadata in this message.
message MonitoredResourceMetadata {
  // Output only. Values for predefined system metadata labels.
  // System labels are a kind of metadata extracted by Google, including
  // "machine_image", "vpc", "subnet_id",
  // "security_group", "name", etc.
  // System label values can be only strings, Boolean values, or a list of
  // strings. For example:
  //
  //     { "name": "my-test-instance",
  //       "security_group": ["a", "b", "c"],
  //       "spot_instance": false }
  google.protobuf.Struct system_labels = 1;

  // Output only. A map of user-defined metadata labels.
  map<string, string> user_labels = 2;
}
