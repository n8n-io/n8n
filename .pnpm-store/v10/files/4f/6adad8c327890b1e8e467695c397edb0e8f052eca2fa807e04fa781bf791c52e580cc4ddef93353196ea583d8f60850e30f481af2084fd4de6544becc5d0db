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

option go_package = "google.golang.org/genproto/googleapis/api/serviceconfig;serviceconfig";
option java_multiple_files = true;
option java_outer_classname = "SystemParameterProto";
option java_package = "com.google.api";
option objc_class_prefix = "GAPI";

// ### System parameter configuration
//
// A system parameter is a special kind of parameter defined by the API
// system, not by an individual API. It is typically mapped to an HTTP header
// and/or a URL query parameter. This configuration specifies which methods
// change the names of the system parameters.
message SystemParameters {
  // Define system parameters.
  //
  // The parameters defined here will override the default parameters
  // implemented by the system. If this field is missing from the service
  // config, default system parameters will be used. Default system parameters
  // and names is implementation-dependent.
  //
  // Example: define api key for all methods
  //
  //     system_parameters
  //       rules:
  //         - selector: "*"
  //           parameters:
  //             - name: api_key
  //               url_query_parameter: api_key
  //
  //
  // Example: define 2 api key names for a specific method.
  //
  //     system_parameters
  //       rules:
  //         - selector: "/ListShelves"
  //           parameters:
  //             - name: api_key
  //               http_header: Api-Key1
  //             - name: api_key
  //               http_header: Api-Key2
  //
  // **NOTE:** All service configuration rules follow "last one wins" order.
  repeated SystemParameterRule rules = 1;
}

// Define a system parameter rule mapping system parameter definitions to
// methods.
message SystemParameterRule {
  // Selects the methods to which this rule applies. Use '*' to indicate all
  // methods in all APIs.
  //
  // Refer to [selector][google.api.DocumentationRule.selector] for syntax
  // details.
  string selector = 1;

  // Define parameters. Multiple names may be defined for a parameter.
  // For a given method call, only one of them should be used. If multiple
  // names are used the behavior is implementation-dependent.
  // If none of the specified names are present the behavior is
  // parameter-dependent.
  repeated SystemParameter parameters = 2;
}

// Define a parameter's name and location. The parameter may be passed as either
// an HTTP header or a URL query parameter, and if both are passed the behavior
// is implementation-dependent.
message SystemParameter {
  // Define the name of the parameter, such as "api_key" . It is case sensitive.
  string name = 1;

  // Define the HTTP header name to use for the parameter. It is case
  // insensitive.
  string http_header = 2;

  // Define the URL query parameter name to use for the parameter. It is case
  // sensitive.
  string url_query_parameter = 3;
}
