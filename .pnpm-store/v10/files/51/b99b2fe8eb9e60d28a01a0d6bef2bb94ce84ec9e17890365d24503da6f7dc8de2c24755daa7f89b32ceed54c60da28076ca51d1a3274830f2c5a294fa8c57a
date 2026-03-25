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
option go_package = "google.golang.org/genproto/googleapis/type/latlng;latlng";
option java_multiple_files = true;
option java_outer_classname = "LatLngProto";
option java_package = "com.google.type";
option objc_class_prefix = "GTP";

// An object that represents a latitude/longitude pair. This is expressed as a
// pair of doubles to represent degrees latitude and degrees longitude. Unless
// specified otherwise, this must conform to the
// <a href="http://www.unoosa.org/pdf/icg/2012/template/WGS_84.pdf">WGS84
// standard</a>. Values must be within normalized ranges.
message LatLng {
  // The latitude in degrees. It must be in the range [-90.0, +90.0].
  double latitude = 1;

  // The longitude in degrees. It must be in the range [-180.0, +180.0].
  double longitude = 2;
}
