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
option java_outer_classname = "EndpointProto";
option java_package = "com.google.api";
option objc_class_prefix = "GAPI";

// `Endpoint` describes a network address of a service that serves a set of
// APIs. It is commonly known as a service endpoint. A service may expose
// any number of service endpoints, and all service endpoints share the same
// service definition, such as quota limits and monitoring metrics.
//
// Example:
//
//     type: google.api.Service
//     name: library-example.googleapis.com
//     endpoints:
//       # Declares network address `https://library-example.googleapis.com`
//       # for service `library-example.googleapis.com`. The `https` scheme
//       # is implicit for all service endpoints. Other schemes may be
//       # supported in the future.
//     - name: library-example.googleapis.com
//       allow_cors: false
//     - name: content-staging-library-example.googleapis.com
//       # Allows HTTP OPTIONS calls to be passed to the API frontend, for it
//       # to decide whether the subsequent cross-origin request is allowed
//       # to proceed.
//       allow_cors: true
message Endpoint {
  // The canonical name of this endpoint.
  string name = 1;

  // Unimplemented. Dot not use.
  //
  // DEPRECATED: This field is no longer supported. Instead of using aliases,
  // please specify multiple [google.api.Endpoint][google.api.Endpoint] for each
  // of the intended aliases.
  //
  // Additional names that this endpoint will be hosted on.
  repeated string aliases = 2 [deprecated = true];

  // The specification of an Internet routable address of API frontend that will
  // handle requests to this [API
  // Endpoint](https://cloud.google.com/apis/design/glossary). It should be
  // either a valid IPv4 address or a fully-qualified domain name. For example,
  // "8.8.8.8" or "myservice.appspot.com".
  string target = 101;

  // Allowing
  // [CORS](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing), aka
  // cross-domain traffic, would allow the backends served from this endpoint to
  // receive and respond to HTTP OPTIONS requests. The response will be used by
  // the browser to determine whether the subsequent cross-origin request is
  // allowed to proceed.
  bool allow_cors = 5;
}
