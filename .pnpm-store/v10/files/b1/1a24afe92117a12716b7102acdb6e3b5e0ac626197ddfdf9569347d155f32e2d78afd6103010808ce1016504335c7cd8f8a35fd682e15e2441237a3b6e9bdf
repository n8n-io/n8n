// Copyright 2022 Google LLC
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

package google.rpc;

option go_package = "google.golang.org/genproto/googleapis/rpc/http;http";
option java_multiple_files = true;
option java_outer_classname = "HttpProto";
option java_package = "com.google.rpc";
option objc_class_prefix = "RPC";

// Represents an HTTP request.
message HttpRequest {
  // The HTTP request method.
  string method = 1;

  // The HTTP request URI.
  string uri = 2;

  // The HTTP request headers. The ordering of the headers is significant.
  // Multiple headers with the same key may present for the request.
  repeated HttpHeader headers = 3;

  // The HTTP request body. If the body is not expected, it should be empty.
  bytes body = 4;
}

// Represents an HTTP response.
message HttpResponse {
  // The HTTP status code, such as 200 or 404.
  int32 status = 1;

  // The HTTP reason phrase, such as "OK" or "Not Found".
  string reason = 2;

  // The HTTP response headers. The ordering of the headers is significant.
  // Multiple headers with the same key may present for the response.
  repeated HttpHeader headers = 3;

  // The HTTP response body. If the body is not expected, it should be empty.
  bytes body = 4;
}

// Represents an HTTP header.
message HttpHeader {
  // The HTTP header key. It is case insensitive.
  string key = 1;

  // The HTTP header value.
  string value = 2;
}
