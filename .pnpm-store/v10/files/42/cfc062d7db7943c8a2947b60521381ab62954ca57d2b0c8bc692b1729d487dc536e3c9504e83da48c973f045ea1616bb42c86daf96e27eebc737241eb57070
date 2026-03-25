// Copyright 2016 Google LLC
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
option java_outer_classname = "ConsumerProto";
option java_package = "com.google.api";

// A descriptor for defining project properties for a service. One service may
// have many consumer projects, and the service may want to behave differently
// depending on some properties on the project. For example, a project may be
// associated with a school, or a business, or a government agency, a business
// type property on the project may affect how a service responds to the client.
// This descriptor defines which properties are allowed to be set on a project.
//
// Example:
//
//    project_properties:
//      properties:
//      - name: NO_WATERMARK
//        type: BOOL
//        description: Allows usage of the API without watermarks.
//      - name: EXTENDED_TILE_CACHE_PERIOD
//        type: INT64
message ProjectProperties {
  // List of per consumer project-specific properties.
  repeated Property properties = 1;
}

// Defines project properties.
//
// API services can define properties that can be assigned to consumer projects
// so that backends can perform response customization without having to make
// additional calls or maintain additional storage. For example, Maps API
// defines properties that controls map tile cache period, or whether to embed a
// watermark in a result.
//
// These values can be set via API producer console. Only API providers can
// define and set these properties.
message Property {
  // Supported data type of the property values
  enum PropertyType {
    // The type is unspecified, and will result in an error.
    UNSPECIFIED = 0;

    // The type is `int64`.
    INT64 = 1;

    // The type is `bool`.
    BOOL = 2;

    // The type is `string`.
    STRING = 3;

    // The type is 'double'.
    DOUBLE = 4;
  }

  // The name of the property (a.k.a key).
  string name = 1;

  // The type of this property.
  PropertyType type = 2;

  // The description of the property
  string description = 3;
}
