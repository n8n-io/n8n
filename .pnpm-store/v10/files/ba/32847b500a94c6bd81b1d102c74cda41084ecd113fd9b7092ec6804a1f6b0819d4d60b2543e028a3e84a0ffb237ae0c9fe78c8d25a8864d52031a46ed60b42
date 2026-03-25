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

package google.monitoring.v3;

option csharp_namespace = "Google.Cloud.Monitoring.V3";
option go_package = "cloud.google.com/go/monitoring/apiv3/v2/monitoringpb;monitoringpb";
option java_multiple_files = true;
option java_outer_classname = "DroppedLabelsProto";
option java_package = "com.google.monitoring.v3";
option php_namespace = "Google\\Cloud\\Monitoring\\V3";
option ruby_package = "Google::Cloud::Monitoring::V3";

// A set of (label, value) pairs that were removed from a Distribution
// time series during aggregation and then added as an attachment to a
// Distribution.Exemplar.
//
// The full label set for the exemplars is constructed by using the dropped
// pairs in combination with the label values that remain on the aggregated
// Distribution time series. The constructed full label set can be used to
// identify the specific entity, such as the instance or job, which might be
// contributing to a long-tail. However, with dropped labels, the storage
// requirements are reduced because only the aggregated distribution values for
// a large group of time series are stored.
//
// Note that there are no guarantees on ordering of the labels from
// exemplar-to-exemplar and from distribution-to-distribution in the same
// stream, and there may be duplicates.  It is up to clients to resolve any
// ambiguities.
message DroppedLabels {
  // Map from label to its value, for all labels dropped in any aggregation.
  map<string, string> label = 1;
}
