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

option go_package = "google.golang.org/genproto/googleapis/api;api";
option java_multiple_files = true;
option java_outer_classname = "LaunchStageProto";
option java_package = "com.google.api";
option objc_class_prefix = "GAPI";

// The launch stage as defined by [Google Cloud Platform
// Launch Stages](https://cloud.google.com/terms/launch-stages).
enum LaunchStage {
  // Do not use this default value.
  LAUNCH_STAGE_UNSPECIFIED = 0;

  // The feature is not yet implemented. Users can not use it.
  UNIMPLEMENTED = 6;

  // Prelaunch features are hidden from users and are only visible internally.
  PRELAUNCH = 7;

  // Early Access features are limited to a closed group of testers. To use
  // these features, you must sign up in advance and sign a Trusted Tester
  // agreement (which includes confidentiality provisions). These features may
  // be unstable, changed in backward-incompatible ways, and are not
  // guaranteed to be released.
  EARLY_ACCESS = 1;

  // Alpha is a limited availability test for releases before they are cleared
  // for widespread use. By Alpha, all significant design issues are resolved
  // and we are in the process of verifying functionality. Alpha customers
  // need to apply for access, agree to applicable terms, and have their
  // projects allowlisted. Alpha releases don't have to be feature complete,
  // no SLAs are provided, and there are no technical support obligations, but
  // they will be far enough along that customers can actually use them in
  // test environments or for limited-use tests -- just like they would in
  // normal production cases.
  ALPHA = 2;

  // Beta is the point at which we are ready to open a release for any
  // customer to use. There are no SLA or technical support obligations in a
  // Beta release. Products will be complete from a feature perspective, but
  // may have some open outstanding issues. Beta releases are suitable for
  // limited production use cases.
  BETA = 3;

  // GA features are open to all developers and are considered stable and
  // fully qualified for production use.
  GA = 4;

  // Deprecated features are scheduled to be shut down and removed. For more
  // information, see the "Deprecation Policy" section of our [Terms of
  // Service](https://cloud.google.com/terms/)
  // and the [Google Cloud Platform Subject to the Deprecation
  // Policy](https://cloud.google.com/terms/deprecation) documentation.
  DEPRECATED = 5;
}
