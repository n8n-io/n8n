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

import "google/api/label.proto";
import "google/api/metric.proto";
import "google/api/monitored_resource.proto";
import "google/monitoring/v3/common.proto";

option csharp_namespace = "Google.Cloud.Monitoring.V3";
option go_package = "cloud.google.com/go/monitoring/apiv3/v2/monitoringpb;monitoringpb";
option java_multiple_files = true;
option java_outer_classname = "MetricProto";
option java_package = "com.google.monitoring.v3";
option php_namespace = "Google\\Cloud\\Monitoring\\V3";
option ruby_package = "Google::Cloud::Monitoring::V3";

// A single data point in a time series.
message Point {
  // The time interval to which the data point applies.  For `GAUGE` metrics,
  // the start time is optional, but if it is supplied, it must equal the
  // end time.  For `DELTA` metrics, the start
  // and end time should specify a non-zero interval, with subsequent points
  // specifying contiguous and non-overlapping intervals.  For `CUMULATIVE`
  // metrics, the start and end time should specify a non-zero interval, with
  // subsequent points specifying the same start time and increasing end times,
  // until an event resets the cumulative value to zero and sets a new start
  // time for the following points.
  TimeInterval interval = 1;

  // The value of the data point.
  TypedValue value = 2;
}

// A collection of data points that describes the time-varying values
// of a metric. A time series is identified by a combination of a
// fully-specified monitored resource and a fully-specified metric.
// This type is used for both listing and creating time series.
message TimeSeries {
  // The associated metric. A fully-specified metric used to identify the time
  // series.
  google.api.Metric metric = 1;

  // The associated monitored resource.  Custom metrics can use only certain
  // monitored resource types in their time series data. For more information,
  // see [Monitored resources for custom
  // metrics](https://cloud.google.com/monitoring/custom-metrics/creating-metrics#custom-metric-resources).
  google.api.MonitoredResource resource = 2;

  // Output only. The associated monitored resource metadata. When reading a
  // time series, this field will include metadata labels that are explicitly
  // named in the reduction. When creating a time series, this field is ignored.
  google.api.MonitoredResourceMetadata metadata = 7;

  // The metric kind of the time series. When listing time series, this metric
  // kind might be different from the metric kind of the associated metric if
  // this time series is an alignment or reduction of other time series.
  //
  // When creating a time series, this field is optional. If present, it must be
  // the same as the metric kind of the associated metric. If the associated
  // metric's descriptor must be auto-created, then this field specifies the
  // metric kind of the new descriptor and must be either `GAUGE` (the default)
  // or `CUMULATIVE`.
  google.api.MetricDescriptor.MetricKind metric_kind = 3;

  // The value type of the time series. When listing time series, this value
  // type might be different from the value type of the associated metric if
  // this time series is an alignment or reduction of other time series.
  //
  // When creating a time series, this field is optional. If present, it must be
  // the same as the type of the data in the `points` field.
  google.api.MetricDescriptor.ValueType value_type = 4;

  // The data points of this time series. When listing time series, points are
  // returned in reverse time order.
  //
  // When creating a time series, this field must contain exactly one point and
  // the point's type must be the same as the value type of the associated
  // metric. If the associated metric's descriptor must be auto-created, then
  // the value type of the descriptor is determined by the point's type, which
  // must be `BOOL`, `INT64`, `DOUBLE`, or `DISTRIBUTION`.
  repeated Point points = 5;

  // The units in which the metric value is reported. It is only applicable
  // if the `value_type` is `INT64`, `DOUBLE`, or `DISTRIBUTION`. The `unit`
  // defines the representation of the stored metric values.
  string unit = 8;
}

// A descriptor for the labels and points in a time series.
message TimeSeriesDescriptor {
  // A descriptor for the value columns in a data point.
  message ValueDescriptor {
    // The value key.
    string key = 1;

    // The value type.
    google.api.MetricDescriptor.ValueType value_type = 2;

    // The value stream kind.
    google.api.MetricDescriptor.MetricKind metric_kind = 3;

    // The unit in which `time_series` point values are reported. `unit`
    // follows the UCUM format for units as seen in
    // https://unitsofmeasure.org/ucum.html.
    // `unit` is only valid if `value_type` is INTEGER, DOUBLE, DISTRIBUTION.
    string unit = 4;
  }

  // Descriptors for the labels.
  repeated google.api.LabelDescriptor label_descriptors = 1;

  // Descriptors for the point data value columns.
  repeated ValueDescriptor point_descriptors = 5;
}

// Represents the values of a time series associated with a
// TimeSeriesDescriptor.
message TimeSeriesData {
  // A point's value columns and time interval. Each point has one or more
  // point values corresponding to the entries in `point_descriptors` field in
  // the TimeSeriesDescriptor associated with this object.
  message PointData {
    // The values that make up the point.
    repeated TypedValue values = 1;

    // The time interval associated with the point.
    TimeInterval time_interval = 2;
  }

  // The values of the labels in the time series identifier, given in the same
  // order as the `label_descriptors` field of the TimeSeriesDescriptor
  // associated with this object. Each value must have a value of the type
  // given in the corresponding entry of `label_descriptors`.
  repeated LabelValue label_values = 1;

  // The points in the time series.
  repeated PointData point_data = 2;
}

// A label value.
message LabelValue {
  // The label value can be a bool, int64, or string.
  oneof value {
    // A bool label value.
    bool bool_value = 1;

    // An int64 label value.
    int64 int64_value = 2;

    // A string label value.
    string string_value = 3;
  }
}

// An error associated with a query in the time series query language format.
message QueryError {
  // The location of the time series query language text that this error applies
  // to.
  TextLocator locator = 1;

  // The error message.
  string message = 2;
}

// A locator for text. Indicates a particular part of the text of a request or
// of an object referenced in the request.
//
// For example, suppose the request field `text` contains:
//
//   text: "The quick brown fox jumps over the lazy dog."
//
// Then the locator:
//
//   source: "text"
//   start_position {
//     line: 1
//     column: 17
//   }
//   end_position {
//     line: 1
//     column: 19
//   }
//
// refers to the part of the text: "fox".
message TextLocator {
  // The position of a byte within the text.
  message Position {
    // The line, starting with 1, where the byte is positioned.
    int32 line = 1;

    // The column within the line, starting with 1, where the byte is
    // positioned. This is a byte index even though the text is UTF-8.
    int32 column = 2;
  }

  // The source of the text. The source may be a field in the request, in which
  // case its format is the format of the
  // google.rpc.BadRequest.FieldViolation.field field in
  // https://cloud.google.com/apis/design/errors#error_details. It may also be
  // be a source other than the request field (e.g. a macro definition
  // referenced in the text of the query), in which case this is the name of
  // the source (e.g. the macro name).
  string source = 1;

  // The position of the first byte within the text.
  Position start_position = 2;

  // The position of the last byte within the text.
  Position end_position = 3;

  // If `source`, `start_position`, and `end_position` describe a call on
  // some object (e.g. a macro in the time series query language text) and a
  // location is to be designated in that object's text, `nested_locator`
  // identifies the location within that object.
  TextLocator nested_locator = 4;

  // When `nested_locator` is set, this field gives the reason for the nesting.
  // Usually, the reason is a macro invocation. In that case, the macro name
  // (including the leading '@') signals the location of the macro call
  // in the text and a macro argument name (including the leading '$') signals
  // the location of the macro argument inside the macro body that got
  // substituted away.
  string nesting_reason = 5;
}
