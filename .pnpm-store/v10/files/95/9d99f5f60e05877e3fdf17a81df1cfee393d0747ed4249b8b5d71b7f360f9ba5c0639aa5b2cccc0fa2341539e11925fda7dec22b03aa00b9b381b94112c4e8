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

package google.logging.type;

import "google/protobuf/duration.proto";

option csharp_namespace = "Google.Cloud.Logging.Type";
option go_package = "google.golang.org/genproto/googleapis/logging/type;ltype";
option java_multiple_files = true;
option java_outer_classname = "HttpRequestProto";
option java_package = "com.google.logging.type";
option php_namespace = "Google\\Cloud\\Logging\\Type";
option ruby_package = "Google::Cloud::Logging::Type";

// A common proto for logging HTTP requests. Only contains semantics
// defined by the HTTP specification. Product-specific logging
// information MUST be defined in a separate message.
message HttpRequest {
  // The request method. Examples: `"GET"`, `"HEAD"`, `"PUT"`, `"POST"`.
  string request_method = 1;

  // The scheme (http, https), the host name, the path and the query
  // portion of the URL that was requested.
  // Example: `"http://example.com/some/info?color=red"`.
  string request_url = 2;

  // The size of the HTTP request message in bytes, including the request
  // headers and the request body.
  int64 request_size = 3;

  // The response code indicating the status of response.
  // Examples: 200, 404.
  int32 status = 4;

  // The size of the HTTP response message sent back to the client, in bytes,
  // including the response headers and the response body.
  int64 response_size = 5;

  // The user agent sent by the client. Example:
  // `"Mozilla/4.0 (compatible; MSIE 6.0; Windows 98; Q312461; .NET
  // CLR 1.0.3705)"`.
  string user_agent = 6;

  // The IP address (IPv4 or IPv6) of the client that issued the HTTP
  // request. This field can include port information. Examples:
  // `"192.168.1.1"`, `"10.0.0.1:80"`, `"FE80::0202:B3FF:FE1E:8329"`.
  string remote_ip = 7;

  // The IP address (IPv4 or IPv6) of the origin server that the request was
  // sent to. This field can include port information. Examples:
  // `"192.168.1.1"`, `"10.0.0.1:80"`, `"FE80::0202:B3FF:FE1E:8329"`.
  string server_ip = 13;

  // The referer URL of the request, as defined in
  // [HTTP/1.1 Header Field
  // Definitions](https://datatracker.ietf.org/doc/html/rfc2616#section-14.36).
  string referer = 8;

  // The request processing latency on the server, from the time the request was
  // received until the response was sent.
  google.protobuf.Duration latency = 14;

  // Whether or not a cache lookup was attempted.
  bool cache_lookup = 11;

  // Whether or not an entity was served from cache
  // (with or without validation).
  bool cache_hit = 9;

  // Whether or not the response was validated with the origin server before
  // being served from cache. This field is only meaningful if `cache_hit` is
  // True.
  bool cache_validated_with_origin_server = 10;

  // The number of HTTP response bytes inserted into cache. Set only when a
  // cache fill was attempted.
  int64 cache_fill_bytes = 12;

  // Protocol used for the request. Examples: "HTTP/1.1", "HTTP/2", "websocket"
  string protocol = 15;
}
