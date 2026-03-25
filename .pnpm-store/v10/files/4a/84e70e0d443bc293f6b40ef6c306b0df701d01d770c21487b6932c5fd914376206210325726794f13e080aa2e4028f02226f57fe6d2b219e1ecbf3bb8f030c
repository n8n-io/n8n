"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Histogram_1 = require("./Histogram");
const encoding_1 = require("./encoding");
const formatters_1 = require("./formatters");
const HISTOGRAM_LOG_FORMAT_VERSION = "1.3";
const timeFormatter = (0, formatters_1.floatFormatter)(5, 3);
class HistogramLogWriter {
    constructor(log) {
        this.log = log;
        /**
         * Base time to subtract from supplied histogram start/end timestamps when
         * logging based on histogram timestamps.
         * Base time is expected to be in msec since the epoch, as histogram start/end times
         * are typically stamped with absolute times in msec since the epoch.
         */
        this.baseTime = 0;
    }
    /**
     * Output an interval histogram, with the given timestamp information and the [optional] tag
     * associated with the histogram, using a configurable maxValueUnitRatio. (note that the
     * specified timestamp information will be used, and the timestamp information in the actual
     * histogram will be ignored).
     * The max value reported with the interval line will be scaled by the given maxValueUnitRatio.
     * @param startTimeStampSec The start timestamp to log with the interval histogram, in seconds.
     * @param endTimeStampSec The end timestamp to log with the interval histogram, in seconds.
     * @param histogram The interval histogram to log.
     * @param maxValueUnitRatio The ratio by which to divide the histogram's max value when reporting on it.
     */
    outputIntervalHistogram(histogram, startTimeStampSec = (histogram.startTimeStampMsec - this.baseTime) / 1000, endTimeStampSec = (histogram.endTimeStampMsec - this.baseTime) / 1000, maxValueUnitRatio = 1000) {
        const base64 = (0, encoding_1.encodeIntoCompressedBase64)(histogram);
        const start = timeFormatter(startTimeStampSec);
        const duration = timeFormatter(endTimeStampSec - startTimeStampSec);
        const max = timeFormatter(histogram.maxValue / maxValueUnitRatio);
        const lineContent = `${start},${duration},${max},${base64}\n`;
        if (histogram.tag && histogram.tag !== Histogram_1.NO_TAG) {
            this.log(`Tag=${histogram.tag},${lineContent}`);
        }
        else {
            this.log(lineContent);
        }
    }
    /**
     * Log a comment to the log.
     * Comments will be preceded with with the '#' character.
     * @param comment the comment string.
     */
    outputComment(comment) {
        this.log(`#${comment}\n`);
    }
    /**
     * Log a start time in the log.
     * @param startTimeMsec time (in milliseconds) since the absolute start time (the epoch)
     */
    outputStartTime(startTimeMsec) {
        this.outputComment(`[StartTime: ${(0, formatters_1.floatFormatter)(5, 3)(startTimeMsec / 1000)} (seconds since epoch), ${new Date(startTimeMsec)}]\n`);
    }
    /**
     * Output a legend line to the log.
     */
    outputLegend() {
        this.log('"StartTimestamp","Interval_Length","Interval_Max","Interval_Compressed_Histogram"\n');
    }
    /**
     * Output a log format version to the log.
     */
    outputLogFormatVersion() {
        this.outputComment("[Histogram log format version " + HISTOGRAM_LOG_FORMAT_VERSION + "]");
    }
}
exports.default = HistogramLogWriter;
//# sourceMappingURL=HistogramLogWriter.js.map