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
option java_outer_classname = "BackendProto";
option java_package = "com.google.api";
option objc_class_prefix = "GAPI";

// `Backend` defines the backend configuration for a service.
message Backend {
  // A list of API backend rules that apply to individual API methods.
  //
  // **NOTE:** All service configuration rules follow "last one wins" order.
  repeated BackendRule rules = 1;
}

// A backend rule provides configuration for an individual API element.
message BackendRule {
  // Path Translation specifies how to combine the backend address with the
  // request path in order to produce the appropriate forwarding URL for the
  // request.
  //
  // Path Translation is applicable only to HTTP-based backends. Backends which
  // do not accept requests over HTTP/HTTPS should leave `path_translation`
  // unspecified.
  enum PathTranslation {
    PATH_TRANSLATION_UNSPECIFIED = 0;

    // Use the backend address as-is, with no modification to the path. If the
    // URL pattern contains variables, the variable names and values will be
    // appended to the query string. If a query string parameter and a URL
    // pattern variable have the same name, this may result in duplicate keys in
    // the query string.
    //
    // # Examples
    //
    // Given the following operation config:
    //
    //     Method path:        /api/company/{cid}/user/{uid}
    //     Backend address:    https://example.cloudfunctions.net/getUser
    //
    // Requests to the following request paths will call the backend at the
    // translated path:
    //
    //     Request path: /api/company/widgetworks/user/johndoe
    //     Translated:
    //     https://example.cloudfunctions.net/getUser?cid=widgetworks&uid=johndoe
    //
    //     Request path: /api/company/widgetworks/user/johndoe?timezone=EST
    //     Translated:
    //     https://example.cloudfunctions.net/getUser?timezone=EST&cid=widgetworks&uid=johndoe
    CONSTANT_ADDRESS = 1;

    // The request path will be appended to the backend address.
    //
    // # Examples
    //
    // Given the following operation config:
    //
    //     Method path:        /api/company/{cid}/user/{uid}
    //     Backend address:    https://example.appspot.com
    //
    // Requests to the following request paths will call the backend at the
    // translated path:
    //
    //     Request path: /api/company/widgetworks/user/johndoe
    //     Translated:
    //     https://example.appspot.com/api/company/widgetworks/user/johndoe
    //
    //     Request path: /api/company/widgetworks/user/johndoe?timezone=EST
    //     Translated:
    //     https://example.appspot.com/api/company/widgetworks/user/johndoe?timezone=EST
    APPEND_PATH_TO_ADDRESS = 2;
  }

  // Selects the methods to which this rule applies.
  //
  // Refer to [selector][google.api.DocumentationRule.selector] for syntax
  // details.
  string selector = 1;

  // The address of the API backend.
  //
  // The scheme is used to determine the backend protocol and security.
  // The following schemes are accepted:
  //
  //    SCHEME        PROTOCOL    SECURITY
  //    http://       HTTP        None
  //    https://      HTTP        TLS
  //    grpc://       gRPC        None
  //    grpcs://      gRPC        TLS
  //
  // It is recommended to explicitly include a scheme. Leaving out the scheme
  // may cause constrasting behaviors across platforms.
  //
  // If the port is unspecified, the default is:
  // - 80 for schemes without TLS
  // - 443 for schemes with TLS
  //
  // For HTTP backends, use [protocol][google.api.BackendRule.protocol]
  // to specify the protocol version.
  string address = 2;

  // The number of seconds to wait for a response from a request. The default
  // varies based on the request protocol and deployment environment.
  double deadline = 3;

  // Deprecated, do not use.
  double min_deadline = 4 [deprecated = true];

  // The number of seconds to wait for the completion of a long running
  // operation. The default is no deadline.
  double operation_deadline = 5;

  PathTranslation path_translation = 6;

  // Authentication settings used by the backend.
  //
  // These are typically used to provide service management functionality to
  // a backend served on a publicly-routable URL. The `authentication`
  // details should match the authentication behavior used by the backend.
  //
  // For example, specifying `jwt_audience` implies that the backend expects
  // authentication via a JWT.
  //
  // When authentication is unspecified, the resulting behavior is the same
  // as `disable_auth` set to `true`.
  //
  // Refer to https://developers.google.com/identity/protocols/OpenIDConnect for
  // JWT ID token.
  oneof authentication {
    // The JWT audience is used when generating a JWT ID token for the backend.
    // This ID token will be added in the HTTP "authorization" header, and sent
    // to the backend.
    string jwt_audience = 7;

    // When disable_auth is true, a JWT ID token won't be generated and the
    // original "Authorization" HTTP header will be preserved. If the header is
    // used to carry the original token and is expected by the backend, this
    // field must be set to true to preserve the header.
    bool disable_auth = 8;
  }

  // The protocol used for sending a request to the backend.
  // The supported values are "http/1.1" and "h2".
  //
  // The default value is inferred from the scheme in the
  // [address][google.api.BackendRule.address] field:
  //
  //    SCHEME        PROTOCOL
  //    http://       http/1.1
  //    https://      http/1.1
  //    grpc://       h2
  //    grpcs://      h2
  //
  // For secure HTTP backends (https://) that support HTTP/2, set this field
  // to "h2" for improved performance.
  //
  // Configuring this field to non-default values is only supported for secure
  // HTTP backends. This field will be ignored for all other backends.
  //
  // See
  // https://www.iana.org/assignments/tls-extensiontype-values/tls-extensiontype-values.xhtml#alpn-protocol-ids
  // for more details on the supported values.
  string protocol = 9;

  // The map between request protocol and the backend address.
  map<string, BackendRule> overrides_by_request_protocol = 10;
}
