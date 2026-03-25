import Histogram, { BitBucketSize } from "./Histogram";
/**
 * A histogram log reader.
 * <p>
 * Histogram logs are used to capture full fidelity, per-time-interval
 * histograms of a recorded value.
 * <p>
 * For example, a histogram log can be used to capture high fidelity
 * reaction-time logs for some measured system or subsystem component.
 * Such a log would capture a full reaction time histogram for each
 * logged interval, and could be used to later reconstruct a full
 * HdrHistogram of the measured reaction time behavior for any arbitrary
 * time range within the log, by adding [only] the relevant interval
 * histograms.
 * <h3>Histogram log format:</h3>
 * A histogram log file consists of text lines. Lines beginning with
 * the "#" character are optional and treated as comments. Lines
 * containing the legend (starting with "Timestamp") are also optional
 * and ignored in parsing the histogram log. All other lines must
 * be valid interval description lines. Text fields are delimited by
 * commas, spaces.
 * <p>
 * A valid interval description line contains an optional Tag=tagString
 * text field, followed by an interval description.
 * <p>
 * A valid interval description must contain exactly four text fields:
 * <ul>
 * <li>StartTimestamp: The first field must contain a number parse-able as a Double value,
 * representing the start timestamp of the interval in seconds.</li>
 * <li>intervalLength: The second field must contain a number parse-able as a Double value,
 * representing the length of the interval in seconds.</li>
 * <li>Interval_Max: The third field must contain a number parse-able as a Double value,
 * which generally represents the maximum value of the interval histogram.</li>
 * <li>Interval_Compressed_Histogram: The fourth field must contain a text field
 * parse-able as a Base64 text representation of a compressed HdrHistogram.</li>
 * </ul>
 * The log file may contain an optional indication of a starting time. Starting time
 * is indicated using a special comments starting with "#[StartTime: " and followed
 * by a number parse-able as a double, representing the start time (in seconds)
 * that may be added to timestamps in the file to determine an absolute
 * timestamp (e.g. since the epoch) for each interval.
 */
declare class HistogramLogReader {
    startTimeSec: number;
    baseTimeSec: number;
    lines: string[];
    currentLineIndex: number;
    bitBucketSize: BitBucketSize;
    useWebAssembly: boolean;
    constructor(logContent: string, bitBucketSize?: BitBucketSize, useWebAssembly?: boolean);
    /**
     * Read the next interval histogram from the log. Returns a Histogram object if
     * an interval line was found, or null if not.
     * <p>Upon encountering any unexpected format errors in reading the next interval
     * from the file, this method will return a null.
     * @return a DecodedInterval, or a null if no appropriate interval found
     */
    nextIntervalHistogram(rangeStartTimeSec?: number, rangeEndTimeSec?: number): Histogram | null;
    private parseStartTimeFromLine;
    private parseBaseTimeFromLine;
}
export declare const listTags: (content: string) => string[];
export default HistogramLogReader;
