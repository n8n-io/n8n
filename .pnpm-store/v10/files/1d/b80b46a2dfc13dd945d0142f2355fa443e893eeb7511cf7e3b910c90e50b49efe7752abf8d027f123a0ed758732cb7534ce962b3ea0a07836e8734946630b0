// Copyright 2020 Google LLC
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

package google.cloud.location;

import "google/api/annotations.proto";
import "google/protobuf/any.proto";
import "google/api/client.proto";

option cc_enable_arenas = true;
option go_package = "google.golang.org/genproto/googleapis/cloud/location;location";
option java_multiple_files = true;
option java_outer_classname = "LocationsProto";
option java_package = "com.google.cloud.location";

// An abstract interface that provides location-related information for
// a service. Service-specific metadata is provided through the
// [Location.metadata][google.cloud.location.Location.metadata] field.
service Locations {
  option (google.api.default_host) = "cloud.googleapis.com";
  option (google.api.oauth_scopes) = "https://www.googleapis.com/auth/cloud-platform";

  // Lists information about the supported locations for this service.
  rpc ListLocations(ListLocationsRequest) returns (ListLocationsResponse) {
    option (google.api.http) = {
      get: "/v1/{name=locations}"
      additional_bindings {
        get: "/v1/{name=projects/*}/locations"
      }
    };
  }

  // Gets information about a location.
  rpc GetLocation(GetLocationRequest) returns (Location) {
    option (google.api.http) = {
      get: "/v1/{name=locations/*}"
      additional_bindings {
        get: "/v1/{name=projects/*/locations/*}"
      }
    };
  }
}

// The request message for [Locations.ListLocations][google.cloud.location.Locations.ListLocations].
message ListLocationsRequest {
  // The resource that owns the locations collection, if applicable.
  string name = 1;

  // The standard list filter.
  string filter = 2;

  // The standard list page size.
  int32 page_size = 3;

  // The standard list page token.
  string page_token = 4;
}

// The response message for [Locations.ListLocations][google.cloud.location.Locations.ListLocations].
message ListLocationsResponse {
  // A list of locations that matches the specified filter in the request.
  repeated Location locations = 1;

  // The standard List next-page token.
  string next_page_token = 2;
}

// The request message for [Locations.GetLocation][google.cloud.location.Locations.GetLocation].
message GetLocationRequest {
  // Resource name for the location.
  string name = 1;
}

// A resource that represents Google Cloud Platform location.
message Location {
  // Resource name for the location, which may vary between implementations.
  // For example: `"projects/example-project/locations/us-east1"`
  string name = 1;

  // The canonical id for this location. For example: `"us-east1"`.
  string location_id = 4;

  // The friendly name for this location, typically a nearby city name.
  // For example, "Tokyo".
  string display_name = 5;

  // Cross-service attributes for the location. For example
  //
  //     {"cloud.googleapis.com/region": "us-east1"}
  map<string, string> labels = 2;

  // Service-specific metadata. For example the available capacity at the given
  // location.
  google.protobuf.Any metadata = 3;
}
