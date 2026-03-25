import Histogram from "./Histogram";
export interface Writable {
    (c: string): void;
}
declare class HistogramLogWriter {
    private log;
    /**
     * Base time to subtract from supplied histogram start/end timestamps when
     * logging based on histogram timestamps.
     * Base time is expected to be in msec since the epoch, as histogram start/end times
     * are typically stamped with absolute times in msec since the epoch.
     */
    baseTime: number;
    constructor(log: Writable);
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
    outputIntervalHistogram(histogram: Histogram, startTimeStampSec?: number, endTimeStampSec?: number, maxValueUnitRatio?: number): void;
    /**
     * Log a comment to the log.
     * Comments will be preceded with with the '#' character.
     * @param comment the comment string.
     */
    outputComment(comment: string): void;
    /**
     * Log a start time in the log.
     * @param startTimeMsec time (in milliseconds) since the absolute start time (the epoch)
     */
    outputStartTime(startTimeMsec: number): void;
    /**
     * Output a legend line to the log.
     */
    outputLegend(): void;
    /**
     * Output a log format version to the log.
     */
    outputLogFormatVersion(): void;
}
export default HistogramLogWriter;
